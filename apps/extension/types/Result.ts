// ----------------------------------------------------------------
// types
// ----------------------------------------------------------------

type Result<T, E> = Success<T> | Failure<E>;
type Success<T> = {
    status: "success";
    data: T;
};
type Failure<E> = {
    status: "failure";
    error: E;
};

export type { Failure, Result, Success };
