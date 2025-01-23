/**
> Author: Fixes Lab <https://github.com/fixes-world/>

# Accounts Pool

The Hybrid Custody Account Pool.
This contract is responsible for managing all the child accounts.

*/
import "EVM"
import "ViewResolver"
import "HybridCustody"

access(all) contract AccountsPool {

    access(all) entitlement Admin
    access(all) entitlement Child

    /* --- Events --- */
    /// Event emitted when a new child account is added, if tick is nil, it means the child account is not a shared account
    access(all) event NewChildAccountAdded(type: String, address: Address, key: String?)

    /* --- Variable, Enums and Structs --- */

    access(all)
    let StoragePath: StoragePath
    access(all)
    let PublicPath: PublicPath

    /// The public interface can be accessed by anyone
    ///
    access(all) resource interface PoolPublic {
        /// ---- Getters ----

        /// Returns the addresses of the FRC20 with the given type
        access(all)
        view fun getAddresses(type: String): {String: Address}
        /// Get Address
        access(all)
        view fun getAddress(type: String, _ key: String): Address?

        /// ----- Access account methods -----
        /// Borrow child's AuthAccount
        access(Child)
        view fun borrowChildAccount(type: String, _ key: String?): auth(Storage, Contracts, Keys, Inbox, Capabilities) &Account?
    }

    /// The admin interface can only be accessed by the the account manager's owner
    ///
    access(all) resource interface PoolAdmin {
        /// Sets up a new child account
        access(Admin)
        fun setupNewChildByKey(
            type: String,
            key: String,
            _ acctCap: Capability<auth(Storage, Contracts, Keys, Inbox, Capabilities) &Account>,
        )
    }

    access(all) resource Pool: PoolPublic, PoolAdmin {
        access(self)
        let hcManagerCap: Capability<auth(HybridCustody.Manage) &HybridCustody.Manager>
        // AccountType -> Key -> Address
        access(self)
        let addressMapping: {String: {String: Address}}

        init(
            _ hcManagerCap: Capability<auth(HybridCustody.Manage) &HybridCustody.Manager>
        ) {
            self.hcManagerCap = hcManagerCap
            self.addressMapping = {}
        }

        /** ---- Public Methods ---- */

        /// Returns the addresses of the FRC20 with the given type
        access(all)
        view fun getAddresses(type: String): {String: Address} {
            if let tickDict = self.addressMapping[type] {
                return tickDict
            }
            return {}
        }

        /// Get Address
        ///
        access(all)
        view fun getAddress(type: String, _ key: String): Address? {
            if let dict = self.borrowDict(type) {
                return dict[key]
            }
            return nil
        }

        /// ----- Access account methods -----
        /// Borrow child's AuthAccount
        ///
        access(Child)
        view fun borrowChildAccount(type: String, _ key: String?): auth(Storage, Contracts, Keys, Inbox, Capabilities) &Account? {
            let hcManagerRef = self.hcManagerCap.borrow()
                ?? panic("Failed to borrow hcManager")

            let specifiedKey = key ?? ""
            if let dict = self.borrowDict(type) {
                if let childAddr = dict[specifiedKey] {
                    if let ownedChild = hcManagerRef.borrowOwnedAccount(addr: childAddr) {
                        return ownedChild.borrowAccount()
                    }
                }
            }
            return nil
        }

        /** ---- Admin Methods ---- */

        /// Sets up a new child account
        ///
        access(Admin)
        fun setupNewChildByKey(
            type: String,
            key: String,
            _ childAcctCap: Capability<auth(Storage, Contracts, Keys, Inbox, Capabilities) &Account>,
        ) {
            pre {
                childAcctCap.check(): "Child account capability is invalid"
            }
            self._ensureDictExists(type)

            let dict = self.borrowDict(type) ?? panic("Failed to borrow tick ")
            // no need to setup if already exists
            if dict[key] != nil {
                return
            }

            // record new child account address
            dict[key] = childAcctCap.address

            // setup new child account
            self._setupChildAccount(childAcctCap)

            // emit event
            emit NewChildAccountAdded(
                type: type,
                address: childAcctCap.address,
                key: key,
            )
        }

        /** ---- Internal Methods ---- */

        /// Sets up a new child account
        ///
        access(self)
        fun _setupChildAccount(
            _ childAcctCap: Capability<auth(Storage, Contracts, Keys, Inbox, Capabilities) &Account>,
        ) {

            let hcManager = self.hcManagerCap.borrow() ?? panic("Failed to borrow hcManager")
            let hcManagerAddr = self.hcManagerCap.address

            // >>> [0] Get child AuthAccount
            var child = childAcctCap.borrow()
                ?? panic("Failed to borrow child account")

            // >>> [1] Child: createOwnedAccount
            if child.storage.borrow<&AnyResource>(from: HybridCustody.OwnedAccountStoragePath) == nil {
                let ownedAccount <- HybridCustody.createOwnedAccount(acct: childAcctCap)
                child.storage.save(<-ownedAccount, to: HybridCustody.OwnedAccountStoragePath)
            }

            // ensure owned account exists
            let childRef = child.storage
                .borrow<auth(HybridCustody.Owner) &HybridCustody.OwnedAccount>(from: HybridCustody.OwnedAccountStoragePath)
                ?? panic("owned account not found")

            // check that paths are all configured properly
            // public path
            child.capabilities.unpublish(HybridCustody.OwnedAccountPublicPath)
            child.capabilities.publish(
                child.capabilities.storage.issue<&HybridCustody.OwnedAccount>(HybridCustody.OwnedAccountStoragePath),
                at: HybridCustody.OwnedAccountPublicPath
            )

            let publishIdentifier = HybridCustody.getOwnerIdentifier(hcManagerAddr)
            // give ownership to manager
            childRef.giveOwnership(to: hcManagerAddr)

            // only childRef will be available after 'giveaway', so we need to re-borrow it
            child = childRef.borrowAccount()

            // unpublish the priv capability
            child.inbox.unpublish<
                auth(HybridCustody.Owner) &{HybridCustody.OwnedAccountPrivate, HybridCustody.OwnedAccountPublic, ViewResolver.Resolver}
            >(publishIdentifier)

            // >> [2] manager: add owned child account

            // Link a Capability for the new owner, retrieve & publish
            let ownedPrivCap = child.capabilities.storage
                .issue<auth(HybridCustody.Owner) &{HybridCustody.OwnedAccountPrivate, HybridCustody.OwnedAccountPublic, ViewResolver.Resolver}>(HybridCustody.OwnedAccountStoragePath)
            assert(ownedPrivCap.check(), message: "Failed to get owned account capability")

            // add owned account to manager
            hcManager.addOwnedAccount(cap: ownedPrivCap)

            // >> [3] Child: Ensure the child account is initialized with COA

            let storagePath = StoragePath(identifier: "evm")!
            let publicPath = PublicPath(identifier: "evm")!
            if child.storage.borrow<&AnyResource>(from: storagePath) == nil {
                let coa <- EVM.createCadenceOwnedAccount()

                // Save the COA to the new account
                child.storage.save<@EVM.CadenceOwnedAccount>(<-coa, to: storagePath)
                let addressableCap = child.capabilities.storage.issue<&EVM.CadenceOwnedAccount>(storagePath)
                child.capabilities.unpublish(publicPath)
                child.capabilities.publish(addressableCap, at: publicPath)
            }
        }

        /// Borrow dictioinary
        ///
        access(self)
        view fun borrowDict(_ type: String): auth(Mutate) &{String: Address}? {
            return &self.addressMapping[type]
        }

        /// ensure type dict exists
        ///
        access(self)
        fun _ensureDictExists(_ type: String) {
            if self.addressMapping[type] == nil {
                self.addressMapping[type] = {}
            }
        }
    }

    /* --- Public Methods --- */

    /// Returns the public account manager interface
    ///
    access(all)
    view fun borrowAccountsPool(): &{PoolPublic} {
        return self.account
            .capabilities.get<&{PoolPublic}>(self.PublicPath)
            .borrow()
            ?? panic("Could not borrow accounts pool reference")
    }

    /// Creates a new Pool resource
    ///
    access(all)
    fun createAccountsPool(
        _ cap: Capability<auth(HybridCustody.Manage) &HybridCustody.Manager>
    ): @Pool {
        return <- create Pool(cap)
    }

    init() {
        let identifier = "AccountsPool_".concat(self.account.address.toString())
        self.StoragePath = StoragePath(identifier: identifier)!
        self.PublicPath = PublicPath(identifier: identifier)!
    }
}
