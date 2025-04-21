# frozen_string_literal: true

class Organizations::Reports::Table::DateRangeFilterComponent < ViewComponent::Base
  def initialize(label:, start_query:, end_query:, help_text: nil)
    @label = label
    @start_query = start_query
    @end_query = end_query
    @help_text = help_text
  end
end
