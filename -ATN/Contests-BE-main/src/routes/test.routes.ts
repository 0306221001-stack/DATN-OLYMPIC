import { Router } from "express";
import { sponsorUploadMiddleware } from "../modules/sponsor/sponsor.upload";

const testRouter = Router();

// Simple test endpoint for file upload without auth
testRouter.post("/test-upload", (req, res, next) => {
  sponsorUploadMiddleware.fields()(req, res, (err: any) => {
    if (err) {
      res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Process the uploaded files
    const files = req.files as any;
    const body = req.body;

    let result: any = {
      success: true,
      message: "Upload test successful",
      data: {
        body: body,
        files: {}
      },
      timestamp: new Date().toISOString()
    };

    if (files) {
      if (files.logo && files.logo[0]) {
        result.data.files.logo = {
          originalName: files.logo[0].originalname,
          filename: files.logo[0].filename,
          size: files.logo[0].size,
          path: files.logo[0].path
        };
      }

      if (files.images && files.images[0]) {
        result.data.files.images = {
          originalName: files.images[0].originalname,
          filename: files.images[0].filename,
          size: files.images[0].size,
          path: files.images[0].path
        };
      }

      if (files.videos && files.videos[0]) {
        result.data.files.videos = {
          originalName: files.videos[0].originalname,
          filename: files.videos[0].filename,
          size: files.videos[0].size,
          path: files.videos[0].path
        };
      }
    }

    res.json(result);
  });
});

export { testRouter };
