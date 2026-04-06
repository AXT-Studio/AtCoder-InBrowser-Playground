export {};

declare global {
    type Success<T> = {
        status: "success";
        details: T;
    };

    type Failure<E> = {
        status: "failure";
        details: E;
    };

    type Result<T, E> = Success<T> | Failure<E>;
}
