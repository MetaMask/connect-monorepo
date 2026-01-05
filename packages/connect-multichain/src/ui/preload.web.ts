/**
 * Web-specific preload that loads Stencil custom elements
 */
export async function preload(): Promise<void> {
  if (typeof document === 'undefined') {
    return;
  }
  try {
    const { defineCustomElements } = await import(
      '@metamask/multichain-ui/loader'
    );
    await defineCustomElements();
  } catch (error) {
    console.error('Failed to load customElements:', error);
  }
}
