// If a handler throws this, the caller controls whether the message goes back 
// to the queue (retriable) or is discarded/dead-lettered (not retriable). 
// Any other thrown error defaults to retriable — safer default than silently 
// dropping a message because of an unexpected bug.
class PubsubError extends Error {
    retriable: boolean;

    constructor(message: string, retriable: boolean = true) {
        super(message);
        this.name = "PubsubError";
        this.retriable = retriable;
    }
}

export default PubsubError;