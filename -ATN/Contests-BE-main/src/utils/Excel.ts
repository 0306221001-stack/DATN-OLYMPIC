import * as XLSX from "xlsx";
import { Response } from "express";

export function exportExcel(
  data: any[],
  fileName: string,
  res: Response
): void {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);

  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const rawFileName = `${fileName}.xlsx`;
  const encodedFileName = encodeURIComponent(rawFileName);

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${rawFileName}"; filename*=UTF-8''${encodedFileName}`
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.send(buffer);
}

export function importExcel(file: Express.Multer.File): Record<string, any>[] {
  if (!file || !file.buffer) {
    throw new Error("File is missing or invalid");
  }

  const workbook = XLSX.read(file.buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const sheetData = XLSX.utils.sheet_to_json<any[]>(worksheet, {
    header: 1,
    defval: "",
  });

  const rows = sheetData.slice(1); // Bỏ dòng tiêu đề nếu cần

  const result = rows.map(row => {
    const obj: Record<string, any> = {};

    for (let i = 0; i < row.length; i++) {
      const colName = String.fromCharCode(65 + i);
      obj[colName] = row[i];
    }

    return obj;
  });

  return result;
}
