import { Injectable } from '@nestjs/common';
import { Page } from 'puppeteer';

@Injectable()
export class HtmlExtractorService {
  private readonly PRIMARY_TERMS: string[] = [
    'Wasser',
    'Mineralwasser',
    'Water',
  ];
  private readonly SECONDARY_TERMS: string[] = ['Cola', 'Kaffee'];

  /**
   * This approach follows a bottom-up strategy, where two fixed terms are searched
   * to identify the common selector for the menu structure.
   */
  async getSelector(page: Page): Promise<string | null> {
    const primaryElement = await this.findElement(page, this.PRIMARY_TERMS);
    const secondaryElement = await this.findElement(page, this.SECONDARY_TERMS);

    if (!primaryElement || !secondaryElement) {
      return null;
    }

    let lastValidSelector: string | null = null;
    let currentSelector: string | null = this.matchSelectors([
      primaryElement.path,
      secondaryElement.path,
    ]);

    while (
      currentSelector &&
      (await this.testSelector(
        page,
        currentSelector,
        primaryElement.term,
        secondaryElement.term,
      ))
    ) {
      lastValidSelector = currentSelector;
      currentSelector = this.simplifyLastSelector(lastValidSelector);
    }

    return lastValidSelector;
  }

  async extractData(page: Page, selector: string): Promise<string[]> {
    return page.evaluate((selector) => {
      return Array.from(document.querySelectorAll(selector))
        .map((el) => el.textContent?.trim())
        .filter((text): text is string => Boolean(text));
    }, selector);
  }

  private simplifyLastSelector(selector: string): string | null {
    const parts = selector.split(' > ');
    let modified = false;

    const newSelector = parts
      .reverse()
      .map((part) => {
        if (!modified && /[#.:]/.test(part)) {
          modified = true;
          return part.replace(/[#.:].*/, '');
        }
        return part;
      })
      .reverse()
      .join(' > ');

    return modified ? newSelector : null;
  }

  private matchSelectors(selectors: string[]) {
    const splitSelectors = selectors.map((selector) => selector.split(' > '));
    const minLength = Math.min(...splitSelectors.map((parts) => parts.length));
    const resultParts: string[] = [];

    for (let i = 0; i < minLength; i++) {
      const firstValue = splitSelectors[0][i];
      const allMatch = splitSelectors.every((parts) => parts[i] === firstValue);

      if (allMatch) {
        resultParts.push(firstValue);
      } else {
        resultParts.push(firstValue.replace(/[#.:].*/, ''));
      }
    }

    return resultParts.join(' > ');
  }

  private async testSelector(
    page: Page,
    selector: string,
    primaryText: string,
    secondaryText: string,
  ): Promise<boolean> {
    const result = await page.evaluate(
      (sel, primary, secondary) => {
        const elements = Array.from(document.querySelectorAll(sel));
        const texts = elements.map(
          (el) =>
            Array.from(el.childNodes)
              .filter((node) => node.nodeType === Node.TEXT_NODE)
              .map((node) => node.textContent?.trim())
              .join(' ') || '',
        );

        const primaryMatch = texts.some((text) =>
          text.toLowerCase().includes(primary.toLowerCase()),
        );
        const secondaryMatch = texts.some((text) =>
          text.toLowerCase().includes(secondary.toLowerCase()),
        );

        return { passing: primaryMatch && secondaryMatch, elements, texts };
      },
      selector,
      primaryText,
      secondaryText,
    );
    return result.passing;
  }

  private async findElement(
    page: Page,
    searchTerms: string[],
  ): Promise<{ tag: string; path: string; term: string } | null> {
    return page.evaluate((terms) => {
      const getDomPath = (el: Element) => {
        const stack: string[] = [];
        while (
          el.parentElement &&
          el.parentElement.tagName.toLowerCase() !== 'body'
        ) {
          const idSelector = el.id ? `#${el.id}` : '';
          const classSelector = el.classList.length
            ? `.${Array.from(el.classList).join('.')}`
            : '';
          const tagName = el.tagName.toLowerCase();
          let siblingIndex = 1;
          let siblingCount = 0;
          for (let i = 0; i < el.parentElement.children.length; i++) {
            const sibling = el.parentElement.children[i];
            if (sibling.nodeName === el.nodeName) {
              siblingCount++;
              if (sibling === el) {
                siblingIndex = siblingCount;
              }
            }
          }
          const selector = `${tagName}${idSelector || classSelector || (siblingCount > 1 ? `:nth-of-type(${siblingIndex})` : '')}`;
          stack.unshift(selector);
          el = el.parentElement;
        }
        return stack.join(' > ');
      };

      const xpathQuery = `//text()[${terms
        .map(
          (term) =>
            `contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ', 'abcdefghijklmnopqrstuvwxyzäöü'), '${term.toLowerCase()}')`,
        )
        .join(' or ')}]/parent::*`;

      const result = document.evaluate(
        xpathQuery,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue;

      if (!result) {
        return null;
      }

      return {
        tag: (result as Element).tagName.toLowerCase(),
        path: getDomPath(result as Element),
        term:
          Array.from(result.childNodes)
            .filter((node) => node.nodeType === Node.TEXT_NODE) // Nur direkte Textknoten
            .map((node) => node.textContent?.trim()) // Textinhalt holen
            .join(' ') || '', // Falls kein Text, leere Zeichenkette zurückgeben
      };
    }, searchTerms);
  }
}
