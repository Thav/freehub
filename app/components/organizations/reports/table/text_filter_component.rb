# frozen_string_literal: true

class Organizations::Reports::Table::TextFilterComponent < ViewComponent::Base
  def initialize(label:, query:, help_text: nil)
    @label = label
    @query = query
    @help_text = help_text
  end

end
