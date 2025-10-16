"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeHtmlId = void 0;
/**
 * Escapes special characters in strings to make them valid HTML IDs.
 * Currently replaces colons with dashes, but can be extended for other characters.
 * @param value - The string to be escaped.
 * @returns The escaped string that is safe to use as an HTML ID.
 */
const escapeHtmlId = (value) => {
    return value.replace(/:/gu, '-');
};
exports.escapeHtmlId = escapeHtmlId;
//# sourceMappingURL=IdHelpers.cjs.map