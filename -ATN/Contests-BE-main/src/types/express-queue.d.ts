declare module "express-queue" {
  import { RequestHandler } from "express";

  interface QueueOptions {
    activeLimit?: number;
    queuedLimit?: number;
  }

  function queue(options?: QueueOptions): RequestHandler;

  export default queue;
}
