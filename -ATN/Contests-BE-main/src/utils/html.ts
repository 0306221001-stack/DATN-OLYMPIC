import { convert } from "html-to-text";
export const htmlToPlainText = (html: string): string => {
  return convert(html, {
    wordwrap: false,
    selectors: [
      { selector: "a", options: { ignoreHref: true } }, // bỏ link
      { selector: "img", format: "skip" }, // bỏ ảnh
    ],
  }).trim();
};
