// The browser tab icon: the same glowing dot as the logo, in the current accent colour.

export function faviconSvg(hex) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<defs><filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.5"/></filter></defs>
<circle cx="16" cy="16" r="10" fill="${hex}" opacity="0.7" filter="url(#glow)"/>
<circle cx="16" cy="16" r="9" fill="${hex}"/>
</svg>`
}

export function setFavicon(hex) {
  const link = document.getElementById('favicon')
  if (link) link.href = `data:image/svg+xml,${encodeURIComponent(faviconSvg(hex))}`
}
