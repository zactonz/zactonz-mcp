/**
 * Outbound calls in flight before further ones wait. The firewall in front of
 * the API blocks a burst of more than twenty requests to one endpoint within
 * two seconds, and most calls take hundreds of milliseconds, so eight at a
 * time keeps a fleet of agents under that without leaving the API idle.
 */
export const DEFAULT_MAX_CONCURRENCY = 8;

/** Calls in a row the API fails to answer before the server stops sending. */
export const DEFAULT_BREAKER_FAILURES = 5;

/** Seconds the server waits, once it has stopped, before trying again. */
export const DEFAULT_BREAKER_SECONDS = 30;

/**
 * @typedef {object} Governor
 * @property {() => number} hold Seconds to wait before calling the API, or 0 to go ahead.
 * @property {(deadline: number, signal?: AbortSignal) => Promise<(() => void) | null>} enter
 * @property {(answered: boolean | null) => void} observe
 * @property {() => { active: number, waiting: number, pausedFor: number }} state
 */

/**
 * Holds back the traffic a process sends to the API, which one API client
 * cannot do on its own: over HTTP a client is built for every request, so the
 * limit has to live somewhere they share.
 *
 * It does two things. It caps how many calls are in flight, queueing the rest,
 * because a fleet of agents through one process will otherwise trip the burst
 * limit in front of the API and have every one of them blocked. And it stops
 * sending altogether once the API has failed to answer several calls in a row,
 * because without that each agent spends its own minute finding out, and the
 * first to try after the wait finds out for all of them.
 *
 * @param {object} [options]
 * @param {number} [options.maxConcurrency] 0 for no limit.
 * @param {number} [options.failures] 0 to keep sending whatever happens.
 * @param {number} [options.cooldown] Seconds.
 * @param {() => number} [options.now]
 * @returns {Governor}
 */
export function createGovernor({
  maxConcurrency = DEFAULT_MAX_CONCURRENCY,
  failures = DEFAULT_BREAKER_FAILURES,
  cooldown = DEFAULT_BREAKER_SECONDS,
  now = Date.now,
} = {}) {
  let active = 0;
  /** @type {{ admit: () => void }[]} */
  const queue = [];

  /** Calls the API has failed to answer since the last one it did answer. */
  let unanswered = 0;
  /**
   * When the server stopped sending, in milliseconds, or null while it is
   * sending. Null rather than 0, because 0 is a time a clock can report.
   *
   * @type {number | null}
   */
  let stoppedAt = null;
  /** Set while one call is on its way to find out whether the API is back. */
  let probing = false;

  /** @returns {number} Seconds left of the wait, or 0. */
  function remaining() {
    if (stoppedAt === null) {
      return 0;
    }
    const left = cooldown * 1000 - (now() - stoppedAt);
    return left > 0 ? Math.ceil(left / 1000) : 0;
  }

  /**
   * Whether to call the API at all. Once the wait is over the first caller is
   * let through to find out whether the API is back; the rest keep waiting
   * until that one reports, so a return to service costs one call, not all of
   * them. Every caller this answers with 0 must report through observe().
   */
  function hold() {
    if (stoppedAt === null) {
      return 0;
    }
    const left = remaining();
    if (left > 0) {
      return left;
    }
    if (probing) {
      return 1;
    }
    probing = true;
    return 0;
  }

  /**
   * What the call found out: that the API answered, that it did not, or
   * nothing at all, for a call that never left.
   *
   * @param {boolean | null} answered
   */
  function observe(answered) {
    probing = false;
    if (answered === null) {
      return;
    }
    if (answered) {
      unanswered = 0;
      stoppedAt = null;
      return;
    }
    unanswered += 1;
    if (failures > 0 && unanswered >= failures) {
      stoppedAt = now();
    }
  }

  /** Gives a slot back, handing it straight to whoever is next in the queue. */
  function leave() {
    const next = queue.shift();
    if (next) {
      next.admit();
    } else {
      active -= 1;
    }
  }

  /**
   * Takes a slot, waiting for a free one when they are all in use. Resolves to
   * the function that gives the slot back, or to null when the call's own
   * deadline arrived first or the client cancelled it while it waited.
   *
   * @param {number} deadline
   * @param {AbortSignal} [signal]
   * @returns {Promise<(() => void) | null>}
   */
  function enter(deadline, signal) {
    if (maxConcurrency <= 0) {
      return Promise.resolve(() => {});
    }
    if (active < maxConcurrency) {
      active += 1;
      return Promise.resolve(leave);
    }
    if (signal?.aborted || deadline - now() <= 0) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      /** @param {(() => void) | null} slot */
      const give = (slot) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abandon);
        resolve(slot);
      };
      const entry = { admit: () => give(leave) };
      const abandon = () => {
        const index = queue.indexOf(entry);
        if (index >= 0) {
          queue.splice(index, 1);
          give(null);
        }
      };
      const timer = setTimeout(abandon, deadline - now());
      signal?.addEventListener('abort', abandon, { once: true });
      queue.push(entry);
    });
  }

  return {
    hold,
    enter,
    observe,
    state: () => ({ active, waiting: queue.length, pausedFor: remaining() }),
  };
}
