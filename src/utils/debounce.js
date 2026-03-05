/**
 * Generic debounce utility.
 * Returns a debounced version of `fn` that only fires after `delay` ms of inactivity.
 */
export function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
