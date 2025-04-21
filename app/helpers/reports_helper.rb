module ReportsHelper
  def person_columns
    [
      { name: 'Name', value: -> (person) { person.full_name } },
      { name: 'Staff', value: -> (person) { person.staff } },
      { name: 'Email', value: -> (person) { person.email } },
      { name: 'Phone', value: -> (person) { person.phone } },
      { name: 'City', value: -> (person) { person.city } },
      { name: 'State', value: -> (person) { person.state } },
      { name: 'Zip', value: -> (person) { person.zip } },
      { name: 'Created', value: -> (person) { person.created_at.strftime('%a %b %e %Y %l:%M%P') } }
    ]
  end

  def service_columns
    [
      { name: 'Name', value: -> (service) { service.person.full_name } },
      { name: 'Service type', value: -> (service) { service.service_type } },
      { name: 'Start date', value: -> (service) { service.start_date&.strftime('%b %e %Y %l:%M%P') } },
      { name: 'End date', value: -> (service) { service.end_date&.strftime('%b %e %Y %l:%M%P') } },
      { name: 'Paid', value: -> (service) { service.paid? } },
      { name: 'Volunteered', value: -> (service) { service.volunteered? } },
      { name: 'Note', value: -> (service) { service.note&.body } }
    ]
  end

  def visit_columns
    [
      { name: 'Name', value: -> (visit) { visit.person.full_name } },
      { name: 'Type', value: -> (visit) { visit.person.staff? ? 'Staff' : 'Patron' } },
      { name: 'Volunteered', value: -> (visit) { visit.volunteer? ? 'Yes' : 'No' } },
      { name: 'Arrived', value: -> (visit) { visit.arrived_at.strftime('%a %b %e %Y %l:%M%P') } },
      { name: 'In', value: -> (visit) { visit.start_at&.strftime('%l:%M%P') } },
      { name: 'Out', value: -> (visit) { visit.end_at&.strftime('%l:%M%P') } },
      { name: 'Note', value: -> (visit) { visit.note&.body } }
    ]
  end
end
