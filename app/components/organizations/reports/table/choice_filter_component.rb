# frozen_string_literal: true

class Organizations::Reports::Table::ChoiceFilterComponent < ViewComponent::Base
  def initialize(label:, query:, options:, help_text: nil)
    @label = label
    @query = query
    @options = options
    @help_text = help_text
  end

end
