import { Router } from "express";
import EnumController from "./enum.controller";

const enumRouter = Router();

/**
 * @route GET /api/enums
 * @description Get all available enums
 * @access Public
 */
enumRouter.get(
  "/",
  EnumController.getAllEnums
);

/**
 * @route GET /api/enums/names
 * @description Get list of available enum names
 * @access Public
 */
enumRouter.get(
  "/names",
  async (req, res) => {
    try {
      const EnumService = (await import("./enum.service")).default;
      const names = await EnumService.getEnumNames();
      res.json({
        success: true,
        message: "Lấy danh sách tên enum thành công",
        data: names,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy danh sách tên enum",
        error: { code: "INTERNAL_SERVER_ERROR" },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @route GET /api/enums/:enumName
 * @description Get specific enum by name
 * @access Public
 */
enumRouter.get(
  "/:enumName",
  EnumController.getEnumByName
);

/**
 * @route GET /api/enums/:enumName/values
 * @description Get enum values as array
 * @access Public
 */
enumRouter.get(
  "/:enumName/values",
  EnumController.getEnumValues
);

/**
 * @route GET /api/enums/:enumName/options
 * @description Get enum options for dropdowns
 * @access Public
 */
enumRouter.get(
  "/:enumName/options",
  EnumController.getEnumOptions
);

export default enumRouter;