<div class="row">
	<div class="span6">
	
		<h2 class="short"><strong>Contact</strong> Us</h2>
		
		<?php $block = module_invoke('contact_form_blocks', 'block_view', '0'); ?>	
    <?php print $block['content']; ?>
		
	</div>
	
	<div class="span6">

		<h4 class="pull-top">Get in <strong>touch</strong></h4>
		<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur eget leo at velit imperdiet varius. In eu ipsum vitae velit congue iaculis vitae at risus.</p>

		<hr />

		<h4>The <strong>Office</strong></h4>
		<ul class="unstyled">
			<li><i class="icon-map-marker"></i> <strong>Address:</strong> 1234 Street Name, City Name, United States</li>
			<li><i class="icon-phone"></i> <strong>Phone:</strong> (123) 456-7890</li>
			<li><i class="icon-envelope"></i> <strong>Email:</strong> <a href="mailto:mail@example.com">mail@example.com</a></li>
		</ul>

		<hr />

		<h4>Business <strong>Hours</strong></h4>
		<ul class="unstyled">
			<li><i class="icon-time"></i> Monday - Friday 9am to 5pm</li>
			<li><i class="icon-time"></i> Saturday - 9am to 2pm</li>
			<li><i class="icon-time"></i> Sunday - Closed</li>
		</ul>

	</div>

</div>