module OrganizationHelper
  # Home: :org_slug
  # People: :org_slug/people
  # Services: :org_slug/services
  # Visits: :org_slug/visits
  def organization_navigation(org)
    [
      { label: 'Home', path: organization_path(org) },
      { label: 'Visits', path: organization_visits_path(org) },
      { label: 'Reports', path: organization_reports_path(org) },
      { label: 'Settings', path: edit_organization_path(org) }
    ]
  end
end
