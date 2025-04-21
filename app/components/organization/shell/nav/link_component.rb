# frozen_string_literal: true

class Organization::Shell::Nav::LinkComponent < ViewComponent::Base
  def initialize(link:)
    @path = link[:path]
    @label = link[:label]
  end

  def active?
    current_page?(@path)
  end
end
