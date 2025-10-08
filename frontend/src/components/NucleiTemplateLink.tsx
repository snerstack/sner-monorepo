interface NucleiData {
  "template-path": string,
}

const NucleiTemplateLink = ({ data }: { data: string }) => {
  try {
    const parsed = JSON.parse(data) as Partial<NucleiData>
    /* c8 ignore next 1 */
    if (!parsed["template-path"]) return null

    const relativePath = parsed["template-path"].split('nuclei-templates/')[1]
    /* c8 ignore next 1 */
    if (!relativePath) return null

    const githubUrl = `https://github.com/projectdiscovery/nuclei-templates/blob/main/${relativePath}`
    return (
      <a href={githubUrl} target="_blank" rel="noreferrer" className="ml-2 small">
        <i className="fas fa-external-link-alt"></i>
      </a>
    )
  /* c8 ignore next 6 */
  } catch (err) {
    console.error('Invalid nuclei vuln.data,', err);
  }

  return null
}

export default NucleiTemplateLink
