import { createRoot } from "react-dom/client";
import Marktone, { type ReplyMention } from "@/components/Marktone";
import { extractReplyMentions } from "@/utils/extractReplyMentions";
import type KintoneClient from "./kintone/kintone-client";
import MentionReplacer from "./markdown/replacer/mention-replacer";

class MarktoneHandler {
  private readonly kintoneClient: KintoneClient;
  private readonly mentionReplacer: MentionReplacer;

  private static isExpandedStatusChangedCommentFormRecord(
    record: MutationRecord,
  ): boolean {
    const targetElement = record.target as HTMLElement;

    if (!targetElement.classList.contains("ocean-ui-comments-commentform"))
      return false;

    const oldValue = record.oldValue;

    if (oldValue === null) return false;

    const currentValue = targetElement.getAttribute("aria-expanded");

    return oldValue !== currentValue;
  }

  constructor(kintoneClient: KintoneClient) {
    this.kintoneClient = kintoneClient;
    this.mentionReplacer = new MentionReplacer(kintoneClient);
  }

  handle(): void {
    this.observeCommentFormAppearance();
  }

  private observeCommentFormAppearance(): void {
    const observer = new MutationObserver((records) => {
      const commentFormRecords = records.filter((record) =>
        MarktoneHandler.isExpandedStatusChangedCommentFormRecord(record),
      );

      for (const record of commentFormRecords) {
        const targetElement = record.target as HTMLElement;
        const isFormExpanded = targetElement.getAttribute("aria-expanded");
        const originalForm = targetElement.querySelector<HTMLFormElement>(
          "form.ocean-ui-comments-commentform-form",
        ) as HTMLFormElement;

        if (isFormExpanded === "true") {
          // The original comment form is opened.
          void this.renderMarktone(originalForm);
        } else {
          // The original comment form is closed.
          this.unmountMarktone(originalForm);
        }
      }
    });

    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeOldValue: true,
      attributeFilter: ["aria-expanded"],
    });
  }

  private async renderMarktone(originalForm: HTMLFormElement): Promise<void> {
    const editorFieldElement = await this.getEditorFieldElement(originalForm);

    const replyMentions = await this.extractReplyMentions(editorFieldElement);
    const marktoneContainer = this.findOrCreateMarktoneContainer(originalForm);

    const root = createRoot(marktoneContainer);
    originalForm.addEventListener(
      "unmountMarktone",
      () => {
        root.unmount();
      },
      { once: true },
    );

    root.render(
      <Marktone
        originalFormEl={originalForm}
        replayMentions={replyMentions}
        kintoneClient={this.kintoneClient}
        mentionReplacer={this.mentionReplacer}
      />,
    );
  }

  private unmountMarktone(originalForm: HTMLFormElement): void {
    const marktoneContainer = originalForm.querySelector<Element>(
      ".marktone-container",
    ) as Element;
    const event = new Event("unmountMarktone");
    originalForm.dispatchEvent(event);
    originalForm.removeChild(marktoneContainer);
  }

  private async extractReplyMentions(
    element: HTMLElement,
  ): Promise<ReplyMention[]> {
    const idAndTypes = extractReplyMentions(element);
    const entities =
      await this.kintoneClient.listDirectoryEntityByIdAndType(idAndTypes);

    return entities.map<ReplyMention>((entity) => {
      return { type: entity.type, code: entity.code };
    });
  }

  private findOrCreateMarktoneContainer(
    originalForm: HTMLFormElement,
  ): HTMLDivElement {
    const container = originalForm.querySelector<HTMLDivElement>(
      ".marktone-container",
    );
    if (container !== null) return container;

    const createdContainer = document.createElement("div");
    createdContainer.classList.add("marktone-container");
    originalForm.prepend(createdContainer);

    return createdContainer;
  }

  private async getEditorFieldElement(
    originalForm: HTMLFormElement,
  ): Promise<HTMLElement> {
    const iframe = originalForm.querySelector<HTMLIFrameElement>(
      "iframe.ocean-ui-editor-field",
    );

    if (iframe) {
      // Wait for iframe to load if not already loaded
      if (!iframe.contentDocument?.body) {
        await new Promise<void>((resolve) => {
          const handleLoad = (): void => {
            iframe.removeEventListener("load", handleLoad);
            resolve();
          };
          iframe.addEventListener("load", handleLoad);
        });
      }

      // Wait for iframe content to be populated with mention elements
      const body = iframe.contentDocument?.body;
      if (body) {
        await this.waitForIframeContent(iframe);
      }

      return iframe.contentDocument?.body ?? iframe;
    }

    const divEditor = originalForm.querySelector<HTMLDivElement>(
      'div.ocean-ui-editor-field[role="textbox"]',
    );
    return divEditor ?? originalForm;
  }

  private waitForIframeContent(iframe: HTMLIFrameElement): Promise<void> {
    return new Promise((resolve) => {
      // If content already exists, resolve immediately
      if (iframe.contentDocument?.body.innerHTML.trim() !== "") {
        resolve();
        return;
      }

      // Use polling to wait for content (more reliable across browsers)
      const pollInterval = 10; // ms
      const maxWaitTime = 1000; // ms
      let elapsedTime = 0;

      const checkContent = (): void => {
        if (iframe.contentDocument?.body.innerHTML.trim() !== "" || elapsedTime >= maxWaitTime) {
          resolve();
          return;
        }
        elapsedTime += pollInterval;
        setTimeout(checkContent, pollInterval);
      };

      setTimeout(checkContent, pollInterval);
    });
  }
}

export default MarktoneHandler;
