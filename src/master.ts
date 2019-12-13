import * as globStream from 'glob-stream';
import { Observable } from 'rxjs';
import { bufferCount, mergeMap } from 'rxjs/operators';

import { ProgressReporter } from './progress-reporter';
import { IDiscoveredFile, IOptions } from './protocol';
import { WorkerPool } from './worker-pool';

const bufferSize = 50;

function runGlobs(files: string[]) {
  return new Observable<IDiscoveredFile>(subscriber => {
    const stream = globStream(files);
    stream.addListener('data', data => subscriber.next(data));
    stream.addListener('error', err => subscriber.error(err));
    stream.addListener('finish', () => subscriber.complete());
    stream.resume();
  });
}

export function spawnWorkers(options: IOptions) {
  const pool = new WorkerPool(options);
  const progress = new ProgressReporter(options.quiet, options.check);

  runGlobs(options.files)
    .pipe(
      bufferCount(bufferSize),
      mergeMap(files => pool.format(files)),
    )
    .subscribe(
      result => progress.update(result),
      err => {
        throw err;
      },
      () => {
        progress.complete();

        if (progress.reformatted && options.check) {
          process.exit(1);
        } else {
          process.exit(0);
        }
      },
    );
}
