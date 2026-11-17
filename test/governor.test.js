import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGovernor } from '../src/governor.js';

/** A deadline far enough out that nothing in a test reaches it. */
const SOON = () => Date.now() + 5000;

test('calls beyond the limit wait for a slot, and take them in turn', async () => {
  const governor = createGovernor({ maxConcurrency: 2 });

  const first = await governor.enter(SOON());
  const second = await governor.enter(SOON());
  assert.ok(first && second);
  assert.deepEqual(governor.state(), { active: 2, waiting: 0, pausedFor: 0 });

  /** @type {string[]} */
  const admitted = [];
  const third = governor.enter(SOON()).then((release) => {
    admitted.push('third');
    return release;
  });
  const fourth = governor.enter(SOON()).then((release) => {
    admitted.push('fourth');
    return release;
  });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.deepEqual(admitted, [], 'neither runs while both slots are taken');
  assert.equal(governor.state().waiting, 2);

  first();
  assert.ok(await third);
  assert.deepEqual(admitted, ['third']);

  second();
  assert.ok(await fourth);
  assert.deepEqual(admitted, ['third', 'fourth'], 'the queue is served in order');
  assert.equal(governor.state().active, 2);
});

test('a slot handed straight over does not leave the count wrong', async () => {
  const governor = createGovernor({ maxConcurrency: 1 });

  const first = await governor.enter(SOON());
  assert.ok(first);
  const queued = governor.enter(SOON());
  first();
  const second = await queued;
  assert.ok(second);
  assert.equal(governor.state().active, 1);

  second();
  assert.deepEqual(governor.state(), { active: 0, waiting: 0, pausedFor: 0 });
});

test('a call that runs out of time while waiting is not admitted', async () => {
  const governor = createGovernor({ maxConcurrency: 1 });
  const held = await governor.enter(SOON());

  assert.equal(await governor.enter(Date.now() + 10), null);
  assert.equal(governor.state().waiting, 0, 'it leaves the queue rather than holding a place');
  assert.equal(await governor.enter(Date.now() - 1), null, 'a deadline already past does not queue at all');

  assert.ok(held);
  held();
});

test('a cancelled call stops waiting and leaves the queue', async () => {
  const governor = createGovernor({ maxConcurrency: 1 });
  const held = await governor.enter(SOON());
  const controller = new AbortController();

  const waiting = governor.enter(SOON(), controller.signal);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(governor.state().waiting, 1);

  controller.abort(new Error('cancelled by client'));
  assert.equal(await waiting, null);
  assert.equal(governor.state().waiting, 0);

  const already = new AbortController();
  already.abort();
  assert.equal(await governor.enter(SOON(), already.signal), null);

  assert.ok(held);
  held();
});

test('no limit means no queue', async () => {
  const governor = createGovernor({ maxConcurrency: 0 });

  for (let index = 0; index < 50; index++) {
    assert.ok(await governor.enter(SOON()));
  }
  assert.deepEqual(governor.state(), { active: 0, waiting: 0, pausedFor: 0 });
});

test('the server stops sending after the API fails to answer enough calls in a row', () => {
  const clock = { now: 0 };
  const governor = createGovernor({ failures: 3, cooldown: 30, now: () => clock.now });

  governor.observe(false);
  governor.observe(false);
  assert.equal(governor.hold(), 0, 'two in a row is not enough');

  governor.observe(false);
  assert.equal(governor.hold(), 30);
  assert.equal(governor.state().pausedFor, 30);

  clock.now += 20000;
  assert.equal(governor.hold(), 10);
});

test('a call the API answers clears the count, whatever it answered', () => {
  const clock = { now: 0 };
  const governor = createGovernor({ failures: 2, cooldown: 30, now: () => clock.now });

  governor.observe(false);
  governor.observe(true);
  governor.observe(false);
  assert.equal(governor.hold(), 0, 'the count starts again after an answer');

  governor.observe(false);
  assert.equal(governor.hold(), 30);
});

test('one call finds out whether the API is back, not all of them', () => {
  const clock = { now: 0 };
  const governor = createGovernor({ failures: 1, cooldown: 30, now: () => clock.now });

  governor.observe(false);
  assert.equal(governor.hold(), 30);

  clock.now += 30000;
  assert.equal(governor.hold(), 0, 'the first caller after the wait goes through');
  assert.equal(governor.hold(), 1, 'the next waits for it to report');

  governor.observe(true);
  assert.equal(governor.hold(), 0, 'the API answered, so everyone sends again');
});

test('a failed trial starts the wait again', () => {
  const clock = { now: 0 };
  const governor = createGovernor({ failures: 1, cooldown: 30, now: () => clock.now });
  governor.observe(false);
  clock.now += 30000;
  assert.equal(governor.hold(), 0);

  governor.observe(false);
  assert.equal(governor.hold(), 30);
});

test('a call that never left reports nothing, and does not hold the trial open', () => {
  const clock = { now: 0 };
  const governor = createGovernor({ failures: 1, cooldown: 30, now: () => clock.now });
  governor.observe(false);
  clock.now += 30000;

  assert.equal(governor.hold(), 0);
  governor.observe(null);
  assert.equal(governor.hold(), 0, 'the trial is free for the next caller');
  assert.equal(governor.hold(), 1);
});

test('the breaker can be turned off', () => {
  const governor = createGovernor({ failures: 0 });

  for (let index = 0; index < 20; index++) {
    governor.observe(false);
  }
  assert.equal(governor.hold(), 0);
});
