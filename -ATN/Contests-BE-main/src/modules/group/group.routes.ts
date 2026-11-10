import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { GroupController } from "@/modules/group";
import {
  CreateGroupsSchema,
  GroupsIdShema,
  GroupsQuerySchema,
  UpdateGroupsSchema,
  deleteGroupsesSchema,
  CreateBulkGroupsSchema,
} from "./group.schema";
import { authenticate, role } from "@/middlewares/auth";
const groupRouter = Router();
// prive

groupRouter.get(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  GroupController.getAlls
);

groupRouter.get(
  "/match/:match",
  authenticate,
  role("Judge"),
  GroupController.getByMatchSlug
);

groupRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(GroupsIdShema),
  GroupController.getById
);

groupRouter.post(
  "/",
  authenticate,
  role("Admin"),
  validateBody(CreateGroupsSchema),
  GroupController.create
);

groupRouter.post(
  "/bulk",
  authenticate,
  role("Admin"),
  validateBody(CreateBulkGroupsSchema),
  GroupController.createBulkGroups
);

groupRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdateGroupsSchema),
  validateParams(GroupsIdShema),
  GroupController.update
);

// api đổi tên nhóm
groupRouter.patch(
  "/:id/name",
  authenticate,
  role("Admin"),
  validateParams(GroupsIdShema),
  validateBody(UpdateGroupsSchema.pick({ name: true })),
  GroupController.updateName
);

groupRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(GroupsIdShema),
  GroupController.delete
);

groupRouter.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteGroupsesSchema),
  GroupController.deletes
);

export { groupRouter };
