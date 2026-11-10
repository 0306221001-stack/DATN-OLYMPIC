import multer from "multer";
const upload = multer({ dest: "tmp/" });

export const uploadContestFiles = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "background", maxCount: 1 },
  { name: "media", maxCount: 10 },
]);
