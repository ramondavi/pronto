export function GovernmentBar({ portalLabel = "Portal do Governo Brasileiro" }: { portalLabel?: string }) {
  return <div id="barra-brasil"><ul id="menu-barra-temp"><li><a href="https://www.gov.br/">{portalLabel}</a></li></ul></div>;
}
