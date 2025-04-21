module VitePack
  extend ActionView::Helpers::AssetTagHelper

  class Loader
    def initialize
      Manifest.instance = Manifest.new(
        Rails.root.join('public', 'manifest.json')
      )
    end
  end

  class Manifest
    class_attribute :instance

    def initialize(manifest_path)
      @manifest_path = manifest_path
    end

    def vite_asset(name, **options)
      raise "Asset #{name} not found in manifest" unless manifest.key?(name)

      manifest[name]
    end

    private

    def manifest
      JSON.parse(File.read(@manifest_path))
    end
  end
end

VitePack::Loader.new
