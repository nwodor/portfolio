declare module "mammoth/mammoth.browser" {
  type MammothMessage = {
    type: string;
    message: string;
  };

  export function convertToHtml(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<{ value: string; messages: MammothMessage[] }>;
}
