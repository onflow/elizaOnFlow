import type { arg } from "@onflow/fcl";
import type * as ftypes from "@onflow/types";
import type { TransactionStatus } from "@onflow/typedefs";

// ----------- General Definitions -----------

export interface ScriptQueryResponse {
    ok: boolean;
    data?: unknown;
    error?: string | Record<string, unknown>;
    errorMessage?: string;
}

export type ArgumentFunction = (
    argFunc: typeof arg,
    t: typeof ftypes,
) => Array<{
    value: unknown;
    xform: unknown;
}>;

export type TransactionStatusCallback = (
    txId: string,
    status: TransactionStatus,
    errorMsg?: string,
) => Promise<void>;

export type TransactionCallbacks = {
    onStatusUpdated?: TransactionStatusCallback;
    onFinalized?: TransactionStatusCallback;
    onSealed?: TransactionStatusCallback;
};

export type TransactionTrackingPayload = {
    txId: string;
    unsubscribe: () => void;
};

export type TransactionSentResponse = {
    txId: string;
    index: number;
};
