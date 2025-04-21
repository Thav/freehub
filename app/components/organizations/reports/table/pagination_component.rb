# frozen_string_literal: true

class Organizations::Reports::Table::PaginationComponent < ViewComponent::Base
  def initialize(pagination_attributes:, table_params:)
    @pagination_attributes = pagination_attributes
    @table_params = table_params
  end

  def render?
    pages > 1
  end

  def page
    @pagination_attributes[:page]
  end

  def per_page
    @pagination_attributes[:per_page]
  end

  def pages
    @pagination_attributes[:pages]
  end

  def page_option_class(page_number)
    return 'relative inline-flex items-center border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-50 focus:z-20' if page != page_number

    'relative inline-flex items-center border px-4 py-2 text-sm font-medium z-10 bg-cyan-50 border-cyan-500 text-cyan-600'
  end

  # Array of shortened page numbers to display in the pagination
  def page_options
    return Array.new(pages) { |i| i + 1 } if pages <= 5

    if page <= 3
      [1, 2, 3, 4, 5, nil, pages]
    elsif page >= pages - 2
      [1, nil, pages - 4, pages - 3, pages - 2, pages - 1, pages]
    else
      [1, nil, page - 1, page, page + 1, nil, pages]
    end
  end
end
