module Pagination
  extend ActiveSupport::Concern

  def paginate(collection, per_page: 40)
    page = (params[:page] || 1).to_i
    per_page = (params[:per_page] || per_page).to_i

    pagination = {
      page: page,
      per_page: per_page,
      pages: (collection.count / per_page.to_f).ceil
    }

    return collection.limit(pagination[:per_page]).offset((pagination[:page] - 1) * pagination[:per_page]), pagination
  end
end
