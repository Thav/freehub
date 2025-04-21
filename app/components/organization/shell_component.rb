# frozen_string_literal: true

class Organization::ShellComponent < ViewComponent::Base
  def initialize(org:, links:, title:)
    @org = org
    @links = links
    @title = title
  end

  def current_user
    helpers.current_user
  end
end
