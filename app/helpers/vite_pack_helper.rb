require 'vite_pack'

module VitePackHelper
  def vite_javascript_tag(name, **options)
    name = "#{name}.js" unless name.end_with?('.js')

    asset = VitePack::Manifest.instance.vite_asset(name, **options)

    out = javascript_include_tag('/' + asset['file'], skip_pipeline: true)
    out << asset.fetch('css', []).map { |css| stylesheet_link_tag('/' + css, skip_pipeline: true) }.join('').html_safe
  end
end
