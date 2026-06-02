declare module "mammoth/mammoth.browser.js" {
  type MammothMessage = {
    type: string;
    message: string;
  };

  type MammothImage = {
    altText?: string;
    contentType: string;
    read: (encoding: "base64") => Promise<string>;
  };

  type MammothOptions = {
    convertImage?: unknown;
    includeDefaultStyleMap?: boolean;
    styleMap?: string[];
  };

  export function convertToHtml(input: {
    arrayBuffer: ArrayBuffer;
  }, options?: MammothOptions): Promise<{ value: string; messages: MammothMessage[] }>;

  export const images: {
    imgElement: (
      converter: (image: MammothImage) => Promise<{ src: string; alt?: string }>,
    ) => unknown;
  };

  const mammoth: {
    convertToHtml: typeof convertToHtml;
    images: typeof images;
  };

  export default mammoth;
}
