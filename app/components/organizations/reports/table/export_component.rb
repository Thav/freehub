# frozen_string_literal: true

class Organizations::Reports::Table::ExportComponent < ViewComponent::Base
  def initialize(path:)
    @path = path
  end
end
