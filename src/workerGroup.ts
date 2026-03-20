export class WorkerGroup {
	readonly maxWorkers: number;
	private active = 0;
	private queue: Array<() => void> = [];
	private doneWaiters: Array<() => void> = [];

	constructor(maxWorkers: number) {
		if (!Number.isFinite(maxWorkers) || maxWorkers < 1) {
			throw new Error('WorkerGroup maxWorkers must be >= 1');
		}
		this.maxWorkers = Math.floor(maxWorkers);
	}

	private maybeResolveDone() {
		if (this.active !== 0) return;
		if (this.queue.length !== 0) return;
		if (this.doneWaiters.length === 0) return;
		const waiters = this.doneWaiters.splice(0, this.doneWaiters.length);
		for (const w of waiters) w();
	}

	run<T>(task: () => Promise<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const start = () => {
				this.active++;
				Promise.resolve()
					.then(task)
					.then(resolve, reject)
					.finally(() => {
						this.active--;
						const next = this.queue.shift();
						if (next) next();
						this.maybeResolveDone();
					});
			};

			if (this.active < this.maxWorkers) start();
			else this.queue.push(start);
		});
	}

	Done(): Promise<void> {
		if (this.active === 0 && this.queue.length === 0) return Promise.resolve();
		return new Promise<void>(resolve => {
			this.doneWaiters.push(resolve);
		});
	}
}

