import { HttpTypes } from "@medusajs/types"
import { Container } from "@modules/common/components/ui"
import Image from "next/image"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const ImageGallery = ({ images }: ImageGalleryProps) => {
  if (!images?.length) {
    return (
      <div className="beemun-gallery-empty">
        <div>
          <span>ZPS 100</span>
          <strong>BEEMUN product imagery</strong>
          <p>Product images will appear here once the maker gallery is connected.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="beemun-gallery-frame">
      <div className="beemun-gallery-stack">
        {images.map((image, index) => {
          return (
            <Container
              key={image.id}
              className="beemun-gallery-image"
              id={image.id}
            >
              {!!image.url && (
                <Image
                  src={image.url}
                  priority={index <= 2 ? true : false}
                  className="absolute inset-0 rounded-rounded"
                  alt={`Product image ${index + 1}`}
                  fill
                  sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
                  style={{
                    objectFit: "cover",
                  }}
                />
              )}
            </Container>
          )
        })}
      </div>
    </div>
  )
}

export default ImageGallery
