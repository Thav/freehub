# frozen_string_literal: true

class Organizations::Reports::LinkComponent < ViewComponent::Base
  def initialize(name:, path:, description:, exportable: true)
    @name = name
    @path = path
    @description = description
    @export_text = exportable ? ', and can be exported as CSV for use in a spreadsheet program.' : '.'
  end
end
