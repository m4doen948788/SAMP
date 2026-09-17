// Minimal shim for the Node stream module in the browser
export const Readable = function() {
    this.pipe = function(dest) { return dest; };
    this.on = function() { return this; };
};

export default {
    Readable
};
