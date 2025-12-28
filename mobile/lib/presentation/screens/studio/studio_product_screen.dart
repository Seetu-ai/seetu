import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/constants.dart';
import '../../../providers/studio_provider.dart';
import '../../../data/api/api_client.dart';
import '../../../data/models/product.dart';
import '../../widgets/progress_indicator.dart';

// Products provider for studio
final studioProductsProvider = FutureProvider<List<Product>>((ref) async {
  final response = await apiClient.get(ApiEndpoints.products);
  final data = response.data as Map<String, dynamic>;
  final products = (data['products'] as List? ?? [])
      .map((json) => Product.fromJson(json as Map<String, dynamic>))
      .toList();
  return products;
});

class StudioProductScreen extends ConsumerStatefulWidget {
  const StudioProductScreen({super.key});

  @override
  ConsumerState<StudioProductScreen> createState() => _StudioProductScreenState();
}

class _StudioProductScreenState extends ConsumerState<StudioProductScreen> {
  final ImagePicker _picker = ImagePicker();
  bool _isUploading = false;
  String? _selectedProductId;

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 90,
      );

      if (image == null) return;

      setState(() {
        _isUploading = true;
        _selectedProductId = null;
      });

      // Upload to server
      final response = await apiClient.uploadFile(
        ApiEndpoints.upload,
        image.path,
      );

      final data = response.data as Map<String, dynamic>;
      final imageUrl = data['url'] as String;
      final productType = data['type'] as String?;

      ref.read(studioProvider.notifier).setProductImage(
        image.path,
        imageUrl,
        productType,
      );

      // Analyze product to get description, colors, materials, etc.
      try {
        final analyzeResponse = await apiClient.post(
          ApiEndpoints.studioAnalyze,
          data: {'imageUrl': imageUrl},
        );
        final analysisData = analyzeResponse.data as Map<String, dynamic>;
        if (analysisData['analysis'] != null) {
          ref.read(studioProvider.notifier).setProductAnalysis(
            analysisData['analysis'] as Map<String, dynamic>,
          );
        }
      } catch (analyzeError) {
        // Analysis is optional - generation can proceed without it
        print('Product analysis failed: $analyzeError');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: ${e.toString()}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isUploading = false);
      }
    }
  }

  void _selectExistingProduct(Product product) {
    setState(() {
      _selectedProductId = product.id;
    });

    // Set the product in studio provider using the product's URL
    ref.read(studioProvider.notifier).setProductFromExisting(
      product.id,
      product.displayUrl,
      product.name,
    );
  }

  void _showImageSourceDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              const Text(
                'Ajouter une photo',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppColors.text,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.camera_alt, color: AppColors.primary),
                ),
                title: const Text('Prendre une photo'),
                subtitle: const Text('Utiliser l\'appareil photo'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.photo_library, color: AppColors.primary),
                ),
                title: const Text('Choisir depuis la galerie'),
                subtitle: const Text('Selectionner une image existante'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.gallery);
                },
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final studioState = ref.watch(studioProvider);
    final productsAsync = ref.watch(studioProductsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () {
                      ref.read(studioProvider.notifier).reset();
                      context.pop();
                    },
                    icon: const Icon(Icons.close),
                  ),
                  const Expanded(
                    child: StudioProgressIndicator(currentStep: 1, totalSteps: 4),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
            ),

            // Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Choisir un produit',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    const Text(
                      'Selectionnez un produit existant ou ajoutez-en un nouveau',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // Products grid
                    productsAsync.when(
                      loading: () => const Center(
                        child: Padding(
                          padding: EdgeInsets.all(AppSpacing.xl),
                          child: CircularProgressIndicator(color: AppColors.primary),
                        ),
                      ),
                      error: (error, stack) => Center(
                        child: Column(
                          children: [
                            const Icon(Icons.error_outline, color: AppColors.error, size: 48),
                            const SizedBox(height: AppSpacing.md),
                            Text('Erreur: $error'),
                            TextButton(
                              onPressed: () => ref.invalidate(studioProductsProvider),
                              child: const Text('Reessayer'),
                            ),
                          ],
                        ),
                      ),
                      data: (products) => GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          mainAxisSpacing: AppSpacing.md,
                          crossAxisSpacing: AppSpacing.md,
                          childAspectRatio: 0.85,
                        ),
                        itemCount: products.length + 1, // +1 for "Add new" button
                        itemBuilder: (context, index) {
                          // First item is "Add new" button
                          if (index == 0) {
                            return _AddNewProductCard(
                              isUploading: _isUploading,
                              hasNewUpload: studioState.productLocalPath != null && _selectedProductId == null,
                              localPath: studioState.productLocalPath,
                              onTap: _showImageSourceDialog,
                            );
                          }

                          final product = products[index - 1];
                          final isSelected = _selectedProductId == product.id;

                          return _ProductSelectCard(
                            product: product,
                            isSelected: isSelected,
                            onTap: () => _selectExistingProduct(product),
                          );
                        },
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Tips
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.info.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.lightbulb_outline,
                            color: AppColors.info,
                            size: 24,
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text(
                                  'Conseils',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.text,
                                  ),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'Fond neutre, bonne lumiere, produit centre',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Footer
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: AppColors.background,
                border: Border(
                  top: BorderSide(color: AppColors.border),
                ),
              ),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: studioState.canProceedToStep2
                      ? () => context.push('/studio/presentation')
                      : null,
                  child: const Text('Continuer'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AddNewProductCard extends StatelessWidget {
  final bool isUploading;
  final bool hasNewUpload;
  final String? localPath;
  final VoidCallback onTap;

  const _AddNewProductCard({
    required this.isUploading,
    required this.hasNewUpload,
    this.localPath,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isUploading ? null : onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(
            color: hasNewUpload ? AppColors.primary : AppColors.border,
            width: hasNewUpload ? 2 : 1,
          ),
        ),
        child: isUploading
            ? const Center(
                child: CircularProgressIndicator(
                  color: AppColors.primary,
                  strokeWidth: 2,
                ),
              )
            : hasNewUpload && localPath != null
                ? Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(AppRadius.md - 2),
                        child: kIsWeb
                            ? Image.network(
                                localPath!,
                                width: double.infinity,
                                height: double.infinity,
                                fit: BoxFit.cover,
                              )
                            : Image.file(
                                File(localPath!),
                                width: double.infinity,
                                height: double.infinity,
                                fit: BoxFit.cover,
                              ),
                      ),
                      Positioned(
                        top: 4,
                        right: 4,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.check,
                            color: Colors.white,
                            size: 14,
                          ),
                        ),
                      ),
                    ],
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.add,
                          color: AppColors.primary,
                          size: 24,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      const Text(
                        'Nouveau',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.text,
                        ),
                      ),
                    ],
                  ),
      ),
    );
  }
}

class _ProductSelectCard extends StatelessWidget {
  final Product product;
  final bool isSelected;
  final VoidCallback onTap;

  const _ProductSelectCard({
    required this.product,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Stack(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.md - 2),
              child: CachedNetworkImage(
                imageUrl: product.displayUrl,
                width: double.infinity,
                height: double.infinity,
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(
                  color: AppColors.surfaceVariant,
                  child: const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.primary,
                      strokeWidth: 2,
                    ),
                  ),
                ),
                errorWidget: (context, url, error) => Container(
                  color: AppColors.surfaceVariant,
                  child: const Icon(
                    Icons.image_not_supported,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ),
            // Selected indicator
            if (isSelected)
              Positioned(
                top: 4,
                right: 4,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check,
                    color: Colors.white,
                    size: 14,
                  ),
                ),
              ),
            // Product name at bottom
            if (product.name != null)
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withOpacity(0.7),
                      ],
                    ),
                    borderRadius: const BorderRadius.vertical(
                      bottom: Radius.circular(AppRadius.md - 2),
                    ),
                  ),
                  child: Text(
                    product.name!,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      color: Colors.white,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
