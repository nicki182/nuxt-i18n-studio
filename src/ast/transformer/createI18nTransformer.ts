import { NodeTypes, type NodeTransform } from "@vue/compiler-dom";

import type {
  ScriptVariableMap,
  TemplateVariableMap,
  PropKeyMap,
  ComponentInitialIndex,
  WrappableElementNode,
  PayloadEntry,
} from "../types";

import { injectI18nDirective } from "../helper";
import { extractDeclaredKeys } from "./extractDeclaredKeys";
import { extractInFileTranslations } from "./extractInFileTranslations";
import { transformComponentProps } from "./transformComponentProps";

export function createI18nTransformer(
  scriptVariableMap: ScriptVariableMap,
  templateVariableMap: TemplateVariableMap,
  propKeyMap: PropKeyMap,
  componentInitialIndex: ComponentInitialIndex,
  currentComponentName: string,
): NodeTransform {
  return (node) => {
    if (node.type !== NodeTypes.ELEMENT) return;
    const el = node as WrappableElementNode;

    if (el.__i18nWrapped) return;
    if (el.tagType === 2 || el.tagType === 3) return; // Skip slots and templates

    let payloadEntries: PayloadEntry[] = [];

    // Layer 1 & 2: Component Prop IDs & Trace Mapping (Mutates & Extracts)
    if (el.tag) {
      const componentEntries = transformComponentProps(
        el,
        componentInitialIndex,
        propKeyMap,
        scriptVariableMap,
        currentComponentName,
      );

      // Early intercept for component usage sites
      if (componentEntries.length > 0 && el.tagType === 1) {
        injectI18nDirective(el, componentEntries);
        return;
      }
      payloadEntries = payloadEntries.concat(componentEntries);
    }

    // Layer 3: Developer Explicit Declarations (Pure Extraction)
    const explicitEntries = extractDeclaredKeys(el);
    payloadEntries = payloadEntries.concat(explicitEntries);

    // Layer 4: Native Text/Attr Extractions (Pure Extraction)
    const dynamicEntries = extractInFileTranslations(
      el,
      scriptVariableMap,
      templateVariableMap,
    );
    payloadEntries = payloadEntries.concat(dynamicEntries);

    // Final Directive compilation hook
    if (payloadEntries.length > 0) {
      injectI18nDirective(el, payloadEntries);
    }
  };
}
