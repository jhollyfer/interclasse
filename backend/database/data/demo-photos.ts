import { PHOTO_STATUS, type PhotoStatus } from '@interclasse/shared'

/** One carousel photo of the demonstration, with the credit of who took it. */
export type DemoPhoto = {
  /** File name in `database/data/demo-photos/`. */
  readonly file: string
  readonly caption: string
  readonly status: PhotoStatus
  readonly credit: {
    readonly title: string
    readonly author: string
    readonly url: string
  }
}

/**
 * The demonstration carousel: balls, courts, nets and the trophy, with no person in
 * the frame. The real carousel shows minors, and the school's image policy is still
 * open (`docs/SECURITY.md` §8): the demonstration shows no face at all.
 *
 * Real photos, not drawings, all in the public domain (CC0 or Public Domain Mark on Flickr),
 * found through Openverse (`api.openverse.org`, filter `license=cc0,pdm`). The public
 * domain dispenses with credit; it stays here anyway, so whoever swaps a photo knows where
 * it came from. Reduced to at most 1280 px and without EXIF.
 *
 * Every status of the resource is covered (_standards/backend.md, "Forma da
 * demonstração"): most approved, so the site carousel has content, one pending
 * and one refused, so the moderation screen has something to show.
 */
export const DEMO_PHOTOS = [
  {
    file: 'futsal-bola.jpg',
    caption: 'Bola de futsal na quadra de terra',
    status: PHOTO_STATUS.APPROVED,
    credit: {
      title: 'Soccer Ball Blue',
      author: 'HolgerLi',
      url: 'https://www.flickr.com/photos/75927009@N05/20952200446',
    },
  },
  {
    file: 'volei-bola.jpg',
    caption: 'Bola de vôlei na areia',
    status: PHOTO_STATUS.APPROVED,
    credit: {
      title: 'Volleyball in sand',
      author: 'popo.uw23',
      url: 'https://www.flickr.com/photos/10511576@N00/37009060962',
    },
  },
  {
    file: 'ginasio-vazio.jpg',
    caption: 'O ginásio antes da abertura',
    status: PHOTO_STATUS.APPROVED,
    credit: {
      title: 'Gym floor',
      author: 'PDomainPhotos',
      url: 'https://www.flickr.com/photos/135941784@N04/25091503653',
    },
  },
  {
    file: 'basquete-bola.jpg',
    caption: 'Bola de basquete no piso do ginásio',
    status: PHOTO_STATUS.APPROVED,
    credit: {
      title: 'Basketball',
      author: 'popo.uw23',
      url: 'https://www.flickr.com/photos/10511576@N00/4760590775',
    },
  },
  {
    file: 'volei-rede.jpg',
    caption: 'A rede de vôlei armada',
    status: PHOTO_STATUS.APPROVED,
    credit: {
      title: 'volleyball net',
      author: 'Abdulla Al Muhairi',
      url: 'https://www.flickr.com/photos/57866029@N00/53665959515',
    },
  },
  {
    file: 'trofeu.jpg',
    caption: 'A taça dos campeões',
    status: PHOTO_STATUS.APPROVED,
    credit: {
      title: 'Trophy Cup 1792–93',
      author: 'museado',
      url: 'https://www.flickr.com/photos/200781279@N05/53869658387',
    },
  },
  {
    file: 'tenis-de-mesa.jpg',
    caption: 'A mesa do tênis de mesa',
    status: PHOTO_STATUS.PENDING,
    credit: {
      title: 'Praktica MTL 5 + Pentacon Electric 4/200',
      author: 'Kojotisko',
      url: 'https://www.flickr.com/photos/98796230@N03/16378171356',
    },
  },
  {
    file: 'basquete-cesta.jpg',
    caption: 'Cesta de basquete, foto pequena demais',
    status: PHOTO_STATUS.REJECTED,
    credit: {
      title: 'Basketball Hoop',
      author: 'EuphoricPenguin22',
      url: 'https://www.flickr.com/photos/202399356@N04/54381173024',
    },
  },
] as const satisfies ReadonlyArray<DemoPhoto>
