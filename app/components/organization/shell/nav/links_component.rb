# frozen_string_literal: true

# Accepts a collection of links and renders them as a list of links.
class Organization::Shell::Nav::LinksComponent < ViewComponent::Base
  def initialize(links:)
    @links = links
  end
end
