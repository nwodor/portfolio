declare module "mammoth/mammoth.browser.js" {
  type MammothMessage = {
    type: string;
    message: string;
  };

  export function convertToHtml(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<{ value: string; messages: MammothMessage[] }>;

  const mammoth: {
    convertToHtml: typeof convertToHtml;
  };

  export default mammoth;
}
