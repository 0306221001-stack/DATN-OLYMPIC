import { Router } from "express";
import { SponsorController } from "./sponsor.controller";
import { authenticate, role } from "@/middlewares/auth";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { handleUploadError } from "@/middlewares/multer/uploadErrorHandler";
import { sponsorUploadMiddleware } from "./sponsor.upload";
import {
  createSponsorSchema,
  updateSponsorSchema,
  getSponsorByIdSchema,
  deleteSponsorSchema,
  getSponsorsQuerySchema,
  contestSlugSchema,
  batchDeleteSponsorsSchema,
  uploadFilesSchema,
} from "./sponsor.schema";

const router = Router();
const sponsorController = new SponsorController();

// Configure upload middleware with error handling
const handleMediaUpload = (uploadMiddleware: any) => {
  return [
    (req: any, res: any, next: any) => {
      uploadMiddleware(req, res, (error: any) => {
        if (error) {
          return handleUploadError(error, req, res, next);
        }
        next();
      });
    },
  ];
};

/**
 * @route GET /api/sponsors/statistics
 * @desc Get sponsors statistics
 * @access Private (Admin/Judge)
 */
router.get(
  "/statistics",
  authenticate,
  role("Admin", "Judge"),
  sponsorController.getSponsorsStatistics.bind(sponsorController)
);

/**
 * @route DELETE /api/sponsors/batch
 * @desc Batch delete sponsors (hard delete)
 * @access Private (Admin only)
 */
router.post(
  "/batch",
  authenticate,
  role("Admin"),
  // validateBody(batchDeleteSponsorsSchema),
  sponsorController.deletes.bind(sponsorController)
);

/**
 * @route GET /api/sponsors/contest/:slug
 * @desc Get sponsors by contest slug
 * @access Public
 */
router.get(
  "/contest/:slug",
  validateParams(contestSlugSchema),
  sponsorController.getSponsorsByContestSlug.bind(sponsorController)
);

/**
 * @route POST /api/sponsors/contest/:slug
 * @desc Create sponsor for specific contest by slug
 * @access Private (Admin only)
 */
router.post(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  ...handleMediaUpload(sponsorUploadMiddleware.fields()),
  validateParams(contestSlugSchema),
  validateBody(createSponsorSchema),
  sponsorController.createSponsorByContestSlug.bind(sponsorController)
);

/**
 * @route GET /api/sponsors
 * @desc Get sponsors with pagination and filtering
 * @access Public
 */

/**
 * @route POST /api/sponsors
 * @desc Create new sponsor
 * @access Private (Admin only)
 */
router.post(
  "/",
  authenticate,
  role("Admin"),
  ...handleMediaUpload(sponsorUploadMiddleware.fields()),
  validateBody(createSponsorSchema),
  sponsorController.createSponsor.bind(sponsorController)
);

/**
 * @route GET /api/sponsors/:id
 * @desc Get sponsor by ID
 * @access Public
 */
router.get(
  "/:id",
  validateParams(getSponsorByIdSchema),
  sponsorController.getSponsorById.bind(sponsorController)
);

/**
 * @route PATCH /api/sponsors/:id
 * @desc Update sponsor (partial update)
 * @access Private (Admin only)
 */
router.patch(
  "/:id",
  authenticate,
  role("Admin"),
  ...handleMediaUpload(sponsorUploadMiddleware.fields()),
  validateParams(getSponsorByIdSchema),
  validateBody(updateSponsorSchema),
  sponsorController.updateSponsor.bind(sponsorController)
);

/**
 * @route DELETE /api/sponsors/:id
 * @desc Hard delete sponsor
 * @access Private (Admin only)
 */
router.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(deleteSponsorSchema),
  sponsorController.deleteSponsor.bind(sponsorController)
);

router.get(
  "/contest/list-video/:slug",
  authenticate,
  role("Admin"),
  SponsorController.SponsorsByContestSlug
);

export { router as sponsorRouter };
