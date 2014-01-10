<?php 
/**
 * Define $root global variable.
 */
global $theme_root, $parent_root, $theme_path;
$theme_root = base_path() . path_to_theme();
$parent_root = base_path() . drupal_get_path('theme', 'porto');

function porto_html_head_alter(&$head_elements) {
	unset($head_elements['system_meta_generator']);
	foreach ($head_elements as $key => $element) {
		if (isset($element['#attributes']['rel']) && $element['#attributes']['rel'] == 'canonical') {
		  unset($head_elements[$key]);
		}
		if (isset($element['#attributes']['rel']) && $element['#attributes']['rel'] == 'shortlink') {
		  unset($head_elements[$key]);
		}
  }
}

/**
 * Overwrite theme_button()
 * @file template.php
 */
function porto_button($variables) {

  $element = $variables['element'];
  $element['#attributes']['type'] = 'submit';
  element_set_attributes($element, array('id', 'name', 'value'));

  $element['#attributes']['class'][] = 'btn-primary btn form-' . $element['#button_type'];
  if (!empty($element['#attributes']['disabled'])) {
    $element['#attributes']['class'][] = 'form-button-disabled';
  }

  return '<input' . drupal_attributes($element['#attributes']) . ' />';
}


/**
 * Assign theme hook suggestions for custom templates.
 */  
function porto_preprocess_page(&$vars, $hook) {
  if (isset($vars['node'])) {
    $suggest = "page__node__{$vars['node']->type}";
    $vars['theme_hook_suggestions'][] = $suggest;
  }
  
  $status = drupal_get_http_header("status");  
  if($status == "404 Not Found") {      
    $vars['theme_hook_suggestions'][] = 'page__404';
  }
  
  if (arg(0) == 'taxonomy' && arg(1) == 'term' ){
    $term = taxonomy_term_load(arg(2));
    $vars['theme_hook_suggestions'][] = 'page--taxonomy--vocabulary--' . $term->vid;
  }
  
 if (request_path() == 'one-page') {
    $vars['theme_hook_suggestions'][] = 'page__onepage';
  }  
}

/**
 * Define some variables for use in theme templates.
 */
function porto_process_page(&$variables) {	
  // Assign site name and slogan toggle theme settings to variables.
  $variables['disable_site_name']   = theme_get_setting('toggle_name') ? FALSE : TRUE;
  $variables['disable_site_slogan'] = theme_get_setting('toggle_slogan') ? FALSE : TRUE;
   // Assign site name/slogan defaults if there is no value.
  if ($variables['disable_site_name']) {
    $variables['site_name'] = filter_xss_admin(variable_get('site_name', 'Drupal'));
  }
  if ($variables['disable_site_slogan']) {
    $variables['site_slogan'] = filter_xss_admin(variable_get('site_slogan', ''));
  }
}	

/**
 * Set up menu.
 */
function porto_menu_link(array $variables) {
  unset($variables['element']['#attributes']['class']);
  $element = $variables['element'];
  static $item_id = 0;
  $menu_name = $element['#original_link']['menu_name'];
  
  // set the global depth variable
  global $depth;
  $depth = $element['#original_link']['depth'];

  if ( ($element['#below']) && ($depth == "1") ) {
    $element['#attributes']['class'][] = 'dropdown';
  }
  
  if ( ($element['#below']) && ($depth == "2") ) {
    $element['#attributes']['class'][] = 'dropdown-submenu';
  }
  
  $sub_menu = $element['#below'] ? drupal_render($element['#below']) : '';
  $output = l($element['#title'], $element['#href'], $element['#localized_options']);
  // if link class is active, make li class as active too
  if(strpos($output,"active")>0){
    $element['#attributes']['class'][] = "active";
  }

  return '<li' . drupal_attributes($element['#attributes']) . '>' . $output . $sub_menu . '</li>';
}

/**
 * Define menu UL class.
 */
function porto_menu_tree($variables){
  // use global depth variable to define ul class
  global $depth;
  $class = ($depth == 1) ? 'nav nav-pills nav-main' : 'dropdown-menu';
  return '<ul class="'.$class.' porto-nav">' . $variables['tree'] . '</ul>';
}

/**
 * Allow sub-menu links to display.
 */
function porto_links($variables) {
  if (array_key_exists('id', $variables['attributes']) && $variables['attributes']['id'] == 'main-menu-links') {
  	$pid = variable_get('menu_main_links_source', 'main-menu');
	$tree = menu_tree($pid);
	return drupal_render($tree);
  }
  return theme_links($variables);
}

/**
 * Customize search form.
 */
function porto_form_alter(&$form, &$form_state, $form_id) {
  if ($form_id == 'search_block_form') {
  
    unset($form['search_block_form']['#title']);
    
    $form['search_block_form']['#title_display'] = 'invisible';
    $form_default = t('Search...');
    $form['search_block_form']['#default_value'] = $form_default;
    $form['actions']['submit'] = array('#type' => 'image_button', '#src' => base_path() . drupal_get_path('theme', 'porto') . '/img/search_icon.png', '#alt' => 'search');
    $form['search_block_form']['#attributes'] = array('onblur' => "if (this.value == '') {this.value = '{$form_default}';}", 'onfocus' => "if (this.value == '{$form_default}') {this.value = '';}" );
  }
} 

/**
 * Put Breadcrumbs in a ul li structure and add descending z-index style to each <a href> tag.
 */
function porto_breadcrumb($variables) {
 $breadcrumb = $variables['breadcrumb'];
 $title = drupal_get_title();
 $crumbs = '';
 
 if (!empty($breadcrumb)) {
   $crumbs = '<ul class="breadcrumb">';
   foreach($breadcrumb as $value) {
     $crumbs .= '<li>'.$value.' <span class="divider">/</span></li> ';
   }
   $crumbs .= '<li class="active"></li>';
   $crumbs .= '</ul>';
    
 }
 return $crumbs;
}

/**
 * Preprocess variables for the username.
 */
function porto_preprocess_username(&$vars) {
  global $theme_key;
  $theme_name = $theme_key;
  
  // Add rel=author for SEO and supporting search engines
  if (isset($vars['link_path'])) {
    $vars['link_attributes']['rel'][] = 'author';
  }
  else {
    $vars['attributes_array']['rel'][] = 'author';
  }
}

/**
 * Overrides theme_item_list().
 */
function porto_item_list($vars) {
  if (isset($vars['attributes']['class']) && in_array('pager', $vars['attributes']['class'])) {
    unset($vars['attributes']['class']);
    foreach ($vars['items'] as $i => &$item) {
      if (in_array('pager-current', $item['class'])) {
        $item['class'] = array('active');
        $item['data'] = '<a href="#">' . $item['data'] . '</a>';
      }
      elseif (in_array('pager-ellipsis', $item['class'])) {
        $item['class'] = array('disabled');
        $item['data'] = '<a href="#">' . $item['data'] . '</a>';
      }
    }
    return '<div class="pagination pagination-large pull-right">' . theme_item_list($vars) . '</div>';
  }
  return theme_item_list($vars);
}

/**
 * Add a comma delimiter between several field types.
 */
function porto_field($variables) {
 
  $output = '';
 
  // Render the label, if it's not hidden.
  if (!$variables['label_hidden']) {
    $output .= '<div class="field-label"' . $variables['title_attributes'] . '>' . $variables['label'] . ':&nbsp;</div>';  
  }
  
  if ($variables['element']['#field_name'] == 'field_tags') {
    // For tags, concatenate into a single, comma-delimitated string.
    foreach ($variables['items'] as $delta => $item) {
      $rendered_tags[] = drupal_render($item);
    }
    $output .= implode(', ', $rendered_tags);
  }
  
  elseif ($variables['element']['#field_name'] == 'body') {
    // For tags, concatenate into a single, comma-delimitated string.
    foreach ($variables['items'] as $delta => $item) {
      $rendered_tags[] = drupal_render($item);
    }
    $output .= implode(', ', $rendered_tags);
  }
  
  elseif ($variables['element']['#field_name'] == 'field_team_bio') {
    // For tags, concatenate into a single, comma-delimitated string.
    foreach ($variables['items'] as $delta => $item) {
      $rendered_tags[] = drupal_render($item);
    }
    $output .= implode(', ', $rendered_tags);
  }
  
  elseif ($variables['element']['#field_name'] == 'field_testimonial_content') {
    // For tags, concatenate into a single, comma-delimitated string.
    foreach ($variables['items'] as $delta => $item) {
      $rendered_tags[] = drupal_render($item);
    }
    $output .= implode(', ', $rendered_tags);
  }
  
   elseif ($variables['element']['#field_name'] == 'field_testimonial_name') {
    // For tags, concatenate into a single, comma-delimitated string.
    foreach ($variables['items'] as $delta => $item) {
      $rendered_tags[] = drupal_render($item);
    }
    $output .= implode(', ', $rendered_tags);
  }
  
   elseif ($variables['element']['#field_name'] == 'field_testimonial_info') {
    // For tags, concatenate into a single, comma-delimitated string.
    foreach ($variables['items'] as $delta => $item) {
      $rendered_tags[] = drupal_render($item);
    }
    $output .= implode(', ', $rendered_tags);
  }
  
  elseif ($variables['element']['#field_name'] == 'field_background_position') {
    // For tags, concatenate into a single, comma-delimitated string.
    foreach ($variables['items'] as $delta => $item) {
      $rendered_tags[] = drupal_render($item);
    }
    $output .= implode(', ', $rendered_tags);
  }
  
  elseif ($variables['element']['#field_name'] == 'field_parallax_icon') {
    // For tags, concatenate into a single, comma-delimitated string.
    foreach ($variables['items'] as $delta => $item) {
      $rendered_tags[] = drupal_render($item);
    }
    $output .= implode(', ', $rendered_tags);
  }
  
  elseif ($variables['element']['#field_name'] == 'field_big_caption') {
    // For tags, concatenate into a single, comma-delimitated string.
    foreach ($variables['items'] as $delta => $item) {
      $rendered_tags[] = drupal_render($item);
    }
    $output .= implode(', ', $rendered_tags);
  }
  
  elseif ($variables['element']['#field_name'] == 'field_small_caption') {
    // For tags, concatenate into a single, comma-delimitated string.
    foreach ($variables['items'] as $delta => $item) {
      $rendered_tags[] = drupal_render($item);
    }
    $output .= implode(', ', $rendered_tags);
  }
  
  elseif ($variables['element']['#field_name'] == 'field_text_color') {
    // For tags, concatenate into a single, comma-delimitated string.
    foreach ($variables['items'] as $delta => $item) {
      $rendered_tags[] = drupal_render($item);
    }
    $output .= implode(', ', $rendered_tags);
  }
  
  elseif ($variables['element']['#field_name'] == 'field_twitter_link') {
    // For tags, concatenate into a single, comma-delimitated string.
    foreach ($variables['items'] as $delta => $item) {
      $rendered_tags[] = drupal_render($item);
    }
    $output .= implode(', ', $rendered_tags);
  }
  
  elseif ($variables['element']['#field_name'] == 'field_facebook_link') {
    // For tags, concatenate into a single, comma-delimitated string.
    foreach ($variables['items'] as $delta => $item) {
      $rendered_tags[] = drupal_render($item);
    }
    $output .= implode(', ', $rendered_tags);
  }
  
  elseif ($variables['element']['#field_name'] == 'field_linkedin_link') {
    // For tags, concatenate into a single, comma-delimitated string.
    foreach ($variables['items'] as $delta => $item) {
      $rendered_tags[] = drupal_render($item);
    }
    $output .= implode(', ', $rendered_tags);
  }
  
  elseif ($variables['element']['#field_name'] == 'field_active') {
    // For tags, concatenate into a single, comma-delimitated string.
    foreach ($variables['items'] as $delta => $item) {
      $rendered_tags[] = drupal_render($item);
    }
    $output .= implode(', ', $rendered_tags);
  }
       
  else {
    $output .= '<div class="field-items"' . $variables['content_attributes'] . '>';
    // Default rendering taken from theme_field().
    foreach ($variables['items'] as $delta => $item) {
      $classes = 'field-item ' . ($delta % 2 ? 'odd' : 'even');
      $output .= '<div class="' . $classes . '"' . $variables['item_attributes'][$delta] . '>' . drupal_render($item) . '</div>';
    }
    $output .= '</div>';
    // Render the top-level DIV.
    $output = '<div class="' . $variables['classes'] . '"' . $variables['attributes'] . '>' . $output . '</div>';
  }
  
  // Render the top-level DIV.
  return $output;
}

/**
 * User CSS function. Separate from porto_preprocess_html so function can be called directly before </head> tag.
 */
function porto_user_css() {
  echo "<!-- User defined CSS -->";
  echo "<style type='text/css'>";
  echo theme_get_setting('user_css');
  echo "</style>";
  echo "<!-- End user defined CSS -->";	
}

/**
 * Get color from theme settings and pass it to LESS stylesheet.
 */
$less_settings = array(
  'variables' => array(
    '@skinColor' => '#'.theme_get_setting('skin_color').'',
  ),
);

drupal_add_css(drupal_get_path('theme', 'porto') .'/css/less/skin.less', array(
  'group' => CSS_THEME,
  'preprocess' => false,
  'less' => $less_settings,
)); 

/**
 * Add theme META tags and style sheets to the header.
 */
function porto_preprocess_html(&$vars){
  global $parent_root;
  
  $viewport = array(
    '#type' => 'html_tag',
    '#tag' => 'meta',
    '#attributes' => array(
      'name' => 'viewport',
      'content' =>  'width=device-width, initial-scale=1, maximum-scale=1',
    )
  );
  
  $bootstrap = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/css/bootstrap.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 1,
  );
  
  $font_awesome = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/css/fonts/font-awesome/css/font-awesome.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 2,
  );
  
  $flexslider = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/vendor/flexslider/flexslider.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 2,
  );
  
  $flexslider = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/vendor/flexslider/flexslider.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 2,
  );
  
  $prettyPhoto = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/vendor/prettyPhoto/css/prettyPhoto.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 3,
  );
  
  $circle_flip = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/vendor/circle-flip-slideshow/css/component.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 4,
  );
  
  $magnific = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/vendor/magnific-popup/magnific-popup.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 5,
  );
  
  $isotope = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/vendor/isotope/jquery.isotope.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 6,
  );
  
  $theme_style = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/css/theme.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 7,
  );
  
  $drupal_theme_style = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/css/drupal-styles.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 8,
  );
  
  $theme_elements = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/css/theme-elements.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 9,
  );
  
  $theme_animate = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/css/theme-animate.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 10,
  );
  
  $theme_blog = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/css/theme-blog.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 11,
  );
  
  $bootstrap_responsive = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/css/bootstrap-responsive.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 12,
  );
  
  $bootstrap_responsive_boxed = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/css/bootstrap-responsive-boxed.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 13,
  );
  
  $theme_responsive = array(
    '#tag' => 'link', 
    '#attributes' => array( 
      'href' => ''.$parent_root.'/css/theme-responsive.css', 
      'rel' => 'stylesheet',
      'type' => 'text/css',
      'media' => 'screen',
    ),
    '#weight' => 14,
  );
  
   $background_image = array(
    '#type' => 'markup',
    '#markup' => "<style type='text/css'>body {background-image:url(".$parent_root."/img/patterns/".theme_get_setting('background_select').".png);}</style> ",
    '#weight' => 15,
  );
  
  $background_color = array(
    '#type' => 'markup',
    '#markup' => "<style type='text/css'>body {background-color: #".theme_get_setting('body_background_color')." !important;}</style> ",
    '#weight' => 16,
  );
  
  drupal_add_html_head( $viewport, 'viewport');
  
  drupal_add_html_head( $bootstrap, 'bootstrap');
  drupal_add_html_head( $font_awesome, 'font_awesome');
  drupal_add_html_head( $flexslider, 'flexslider');
  drupal_add_html_head( $prettyPhoto, 'prettyPhoto');
  drupal_add_html_head( $circle_flip, 'circle_flip');
  drupal_add_html_head( $magnific, 'magnific');
  drupal_add_html_head( $isotope, 'isotope');
  drupal_add_html_head( $theme_style, 'theme_style');
  drupal_add_html_head( $drupal_theme_style, 'drupal_theme_style');
  drupal_add_html_head( $theme_elements, 'theme_elements');
  drupal_add_html_head( $theme_animate, 'theme_animate');
  drupal_add_html_head( $theme_blog, 'theme_blog');
  
  if (theme_get_setting('site_layout') == "boxed") {
    drupal_add_html_head( $bootstrap_responsive_boxed, 'boxed_layout' );
  }
  
  if (theme_get_setting('site_layout') == "wide") {
    drupal_add_html_head( $bootstrap_responsive, 'wide_layout' );
  }
  
  drupal_add_html_head( $theme_responsive, 'theme_responsive');
  
  if (theme_get_setting('body_background') == "porto_backgrounds" && theme_get_setting('site_layout') == "boxed") {
    drupal_add_html_head( $background_image, 'background_image');
  } 
  
  if (theme_get_setting('body_background') == "custom_background_color") {
    drupal_add_html_head( $background_color, 'background_color');
  }

}

?>