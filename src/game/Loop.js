export class Loop {
  constructor(update, render, step = 1 / 60) {
    this.update = update;
    this.render = render;
    this.step = step;
    this.maxDelta = 0.25;
    this.maxSubSteps = 5;
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
    this.frameId = 0;
    this.frame = this.frame.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  frame(now) {
    if (!this.running) return;

    let delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (delta > this.maxDelta) delta = this.maxDelta;

    this.accumulator += delta;
    let steps = 0;
    while (this.accumulator >= this.step && steps < this.maxSubSteps) {
      this.update(this.step);
      this.accumulator -= this.step;
      steps += 1;
    }

    if (steps === this.maxSubSteps) {
      this.accumulator = 0;
    }

    this.render(this.accumulator / this.step);
    this.frameId = requestAnimationFrame(this.frame);
  }
}
