/// <reference lib="webworker" />
import { generateAllSnapshots } from '../domain/generator';
import { parseCsv, type ParseOptions } from '../domain/parser';

type Req =
  | { type: 'generate'; seed: number }
  | { type: 'parse'; text: string; opts: ParseOptions };

self.onmessage = (ev: MessageEvent<Req>) => {
  const msg = ev.data;
  try {
    if (msg.type === 'generate') {
      const data = generateAllSnapshots(msg.seed);
      (self as unknown as Worker).postMessage({ type: 'generated', data });
    } else if (msg.type === 'parse') {
      const result = parseCsv(msg.text, msg.opts);
      (self as unknown as Worker).postMessage({ type: 'parsed', result });
    }
  } catch (e) {
    (self as unknown as Worker).postMessage({
      type: 'error',
      message: e instanceof Error ? e.message : String(e),
    });
  }
};
