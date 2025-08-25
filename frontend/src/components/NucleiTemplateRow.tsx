const NucleiTemplateRow = ({ templateUrl }: { templateUrl: string }) => {
  const relativePath = templateUrl.split('nuclei-templates/')[1]
  const githubUrl = `https://github.com/projectdiscovery/nuclei-templates/blob/main/${relativePath}`

  return (
    <tr>
      <th>nuclei template</th>
      <td colSpan={5}>
        <a
          href={githubUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary"
          style={{ textDecoration: 'underline' }}
        >
          {relativePath} <i className="fas fa-external-link-alt" style={{ fontSize: '0.8em' }}></i>
        </a>
      </td>
    </tr>
  )
}

export default NucleiTemplateRow
