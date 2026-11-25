import { Router } from "express";
import AboutController from "./about.controller";
import { validateBody, validateQuery, validateParams } from "@/utils/validation";
import { 
  CreateAboutSchema, 
  UpdateAboutSchema, 
  AboutQuerySchema, 
  AboutIdSchema 
} from "./about.schema";
import { authenticate, role } from "@/middlewares/auth";
import { aboutMediaUpload } from "./about.upload";
import { handleUploadError } from "@/middlewares/multer/uploadErrorHandler";

const aboutRouter = Router();

// Apply authentication middleware to all routes
// aboutRouter.use(authenticate);

// Get all about information with pagination
aboutRouter.get(
  "/",
  validateQuery(AboutQuerySchema),
  AboutController.getAllAbout
);

// Get about information by ID
aboutRouter.get(
  "/:id",
  validateParams(AboutIdSchema),
  AboutController.getAboutById
);

// Create about information
aboutRouter.post(
  "/",
  authenticate,
  role("Admin", "Judge"),
  (req, res, next) => {
    aboutMediaUpload(req, res, (error) => {
      if (error) {
        return handleUploadError(error, req, res, next);
      }
      next();
    });
  },
  validateBody(CreateAboutSchema),
  AboutController.createAbout
);

// Update about information
aboutRouter.put(
  "/:id",
  authenticate,
  role("Admin", "Judge"),
  validateParams(AboutIdSchema),
  (req, res, next) => {
    aboutMediaUpload(req, res, (error) => {
      if (error) {
        return handleUploadError(error, req, res, next);
      }
      next();
    });
  },
  validateBody(UpdateAboutSchema),
  AboutController.updateAbout
);

// Delete about information (soft delete)
aboutRouter.delete(
  "/:id",
  authenticate,
  role("Admin", "Judge"),
  validateParams(AboutIdSchema),
  AboutController.deleteAbout
);

// Restore deleted about information
aboutRouter.patch(
  "/:id/restore",
  authenticate,
  role("Admin", "Judge"),
  validateParams(AboutIdSchema),
  AboutController.restoreAbout
);

// Permanently delete about information
aboutRouter.delete(
  "/:id/permanent",
  authenticate,
  role("Admin", "Judge"),
  validateParams(AboutIdSchema),
  AboutController.permanentDeleteAbout
);

export { aboutRouter };