# frozen_string_literal: true

class Organizations::Reports::TableComponent < ViewComponent::Base
  renders_many :filters, types: {
    text: Organizations::Reports::Table::TextFilterComponent,
    date_range: Organizations::Reports::Table::DateRangeFilterComponent,
    choice: Organizations::Reports::Table::ChoiceFilterComponent
  }
  renders_one :pagination, Organizations::Reports::Table::PaginationComponent
  renders_one :export, Organizations::Reports::Table::ExportComponent

  def initialize(collection:, columns:)
    @collection = collection
    @columns = columns
  end
end
