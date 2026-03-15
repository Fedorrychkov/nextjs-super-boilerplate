'use server'

import { ArrowLeftIcon, HomeIcon, PlusIcon, SearchIcon, UserIcon } from 'lucide-react'

import { CopyContainer } from '~/components/Blocks/CopyContainer'
import { PrettyContainer } from '~/components/Blocks/RenderContainer'
import { CustomTable, TableDefaultSkeleton } from '~/components/Blocks/Table'
import { CustomTooltip } from '~/components/Blocks/Tooltip'
import { Block, HorizontalContainer, ImageLoader } from '~/components/Containers'
import { InputField, MultiselectField, TextAreaField } from '~/components/Fields'
import { NumberFormat } from '~/components/Format'
import { Pagination } from '~/components/List'
import { PaginationSkeleton } from '~/components/List/PaginationSkeleton'
import { Skeleton, SpinnerScreen } from '~/components/Loaders'
import { BottomNavigation, HeaderNavigation, SettingsNavigation } from '~/components/Navigation'
import { AlertBlock, Button, TableCell, TableRow, Typography } from '~/components/ui'

import { Sticky } from './Sticky'
import { TextAreaWithState } from './TextAreaWithState'

const UiKitRoot = async () => {
  return (
    <div className="w-full h-full flex justify-center flex-col gap-8 flex-1">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Typography variant="heading-1">UI Kit</Typography>
          <Typography variant="Body/S/Regular">
            We attached much more components to help you build your next project. You can find all the components in this page.
          </Typography>
          <Typography variant="Body/S/Regular">
            We are using shadcn/ui as a base for the components. You can find the source code of the components in the{' '}
            <Typography variant="Body/S/Regular" asTag="a" href="https://github.com/shadcn/ui" target="_blank" rel="noopener noreferrer">
              shadcn/ui
            </Typography>{' '}
            repository or{' '}
            <Typography variant="Body/S/Regular" asTag="a" href="https://21st.dev" target="_blank" rel="noopener noreferrer">
              21st.dev
            </Typography>
            .
          </Typography>
        </div>

        <div className="flex flex-col gap-2">
          <Typography variant="heading-1">Typography</Typography>
          <Typography variant="Body/S/Regular">
            Typography is used to style the text of the page. It is used to add heading 1, heading 2, heading 3, body large regular, body large semibold, body
            medium regular, body medium semibold, body small regular, body small semibold, body extra small regular and body extra small semibold.
          </Typography>
        </div>

        <div className="flex flex-col gap-2">
          <Typography variant="heading-1">Heading 1</Typography>
          <Typography variant="heading-2">Heading 2</Typography>
          <Typography variant="heading-3">Heading 3</Typography>
          <Typography variant="Body/L/Regular">Body/L/Regular</Typography>
          <Typography variant="Body/L/Semibold">Body/L/Semibold</Typography>
          <Typography variant="Body/M/Regular">Body/M/Regular</Typography>
          <Typography variant="Body/M/Semibold">Body/M/Semibold</Typography>
          <Typography variant="Body/S/Regular">Body/S/Regular</Typography>
          <Typography variant="Body/S/Semibold">Body/S/Semibold</Typography>
          <Typography variant="Body/XS/Regular">Body/XS/Regular</Typography>
          <Typography variant="Body/XS/Semibold">Body/XS/Semibold</Typography>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Typography variant="heading-1">Button</Typography>
          <Typography variant="Body/S/Regular">
            Button is used to trigger an action. It is used to add default, loading, disabled, outline, secondary, ghost, link, destructive, default sm, default
            sm-md, default lg, icon and input icon button.
          </Typography>
        </div>

        <div className="flex flex-row flex-wrap gap-2">
          <Button variant="default">Button Default</Button>
          <Button variant="default" isLoading>
            Button Loading
          </Button>
          <Button variant="default" disabled>
            Button Disabled
          </Button>
          <Button variant="outline">Button Outline</Button>
          <Button variant="secondary">Button Secondary</Button>
          <Button variant="ghost">Button Ghost</Button>
          <Button variant="link">Button Link</Button>
          <Button variant="destructive">Button Destructive</Button>
          <Button variant="default" size="sm">
            Button Default sm
          </Button>
          <Button variant="outline" size="sm-md">
            Button Default sm-md
          </Button>
          <Button variant="outline" size="lg">
            Button Default lg
          </Button>
          <Button variant="outline" size="icon">
            <PlusIcon />
          </Button>
          <Button variant="outline" size="input-icon">
            <SearchIcon />
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Typography variant="heading-1">Alert</Typography>
          <Typography variant="Body/S/Regular">
            Alert is used to show a notification message. It is used to add secondary, primary, destructive, success, info, warning and mono alert.
          </Typography>
        </div>

        <div className="flex flex-row flex-wrap gap-2">
          <AlertBlock notify={{ type: 'secondary', message: 'Alert Secondary' }} />
          <AlertBlock notify={{ type: 'primary', message: 'Alert Primary' }} />
          <AlertBlock notify={{ type: 'destructive', message: 'Alert Destructive' }} />
          <AlertBlock notify={{ type: 'success', message: 'Alert Success' }} />
          <AlertBlock notify={{ type: 'info', message: 'Alert Info' }} />
          <AlertBlock notify={{ type: 'warning', message: 'Alert Warning' }} />
          <AlertBlock notify={{ type: 'mono', message: 'Alert Mono' }} />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Typography variant="heading-1">Skeleton</Typography>
          <Typography variant="Body/S/Regular">
            Skeleton is used to show a loading state. It is used to add default skeleton, pagination skeleton, table default skeleton, spinner screen and more.
          </Typography>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <Typography variant="Body/M/Semibold">Default Skeleton</Typography>
            <Skeleton className="w-full h-10" />
          </div>
          <div className="flex flex-col gap-1">
            <Typography variant="Body/M/Semibold">Pagination Skeleton</Typography>
            <PaginationSkeleton />
          </div>
          <div className="flex flex-col gap-1">
            <Typography variant="Body/M/Semibold">Table Default Skeleton</Typography>
            <TableDefaultSkeleton size={3} />
          </div>
          <div className="flex flex-col gap-1">
            <Typography variant="Body/M/Semibold">Spinner Screen</Typography>
            <SpinnerScreen />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Typography variant="heading-1">Navigation</Typography>
          <Typography variant="Body/S/Regular">
            Navigation is used to navigate between pages. It is used to add bottom navigation, header navigation and settings navigation.
          </Typography>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1 relative">
            <Typography variant="Body/M/Semibold">Bottom Navigation</Typography>
            <BottomNavigation
              className="relative"
              nav={[
                { title: 'Home', url: '/', icon: <HomeIcon /> },
                { title: 'Profile', url: '/profile', icon: <UserIcon /> },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Typography variant="Body/M/Semibold">Header Navigation</Typography>
            <HeaderNavigation
              nav={[
                { title: 'Home', url: '/', icon: <HomeIcon /> },
                { title: 'Profile', url: '/profile', icon: <UserIcon /> },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Typography variant="Body/M/Semibold">Settings Navigation</Typography>
            <SettingsNavigation
              nav={[
                { title: 'Home', url: '/', icon: <HomeIcon /> },
                { title: 'Profile', url: '/profile', icon: <UserIcon /> },
              ]}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Typography variant="heading-1">Containers</Typography>
          <Typography variant="Body/S/Regular">
            Containers are used to wrap the content of the page. They are used to add copied content, tooltip content, pretty container, number format, etc.
          </Typography>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex sm:flex-row sm:justify-between flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Typography variant="Body/M/Semibold">Block</Typography>
              <Block>
                <Typography variant="Body/M/Regular">Block children</Typography>
              </Block>
            </div>
            <div className="flex flex-col gap-1">
              <Typography variant="Body/M/Semibold">Image Lazy with empty image</Typography>
              <ImageLoader src="https://via.placeholder.com/150" className="w-10 h-10" defaultPlaceholder={<Skeleton className="w-10 h-10" />} />
            </div>
            <div className="flex flex-col gap-1">
              <Typography variant="Body/M/Semibold">Image Lazy with image</Typography>
              <ImageLoader
                width={40}
                height={40}
                src="https://ucarecdn.com/aa79be7b-dc5d-4d8a-9543-4bcecd75b6af/start_after.png"
                className="w-10 h-10"
                defaultPlaceholder={<Skeleton className="w-10 h-10" />}
              />
            </div>
          </div>
          <div className="flex sm:flex-row sm:justify-between flex-col gap-2">
            <div className="flex flex-col gap-1 sm:max-w-[50%]">
              <Typography variant="Body/M/Semibold">Horizontal Container</Typography>
              <HorizontalContainer>
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="flex flex-col gap-1">
                    <Typography variant="Body/M/Regular">children {index + 1}</Typography>
                  </div>
                ))}
              </HorizontalContainer>
            </div>
            <div className="flex flex-col gap-1 sm:max-w-[50%] w-full">
              <Typography variant="Body/M/Semibold">Ref Sticky Container</Typography>
              <Sticky />
            </div>
          </div>
          <div className="flex sm:flex-row flex-wrap sm:justify-between flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Typography variant="Body/M/Semibold">Copy Container</Typography>
              <CopyContainer
                successNotifyText="Image url successfully copied"
                content="https://ucarecdn.com/aa79be7b-dc5d-4d8a-9543-4bcecd75b6af/start_after.png"
              >
                <Typography variant="Body/M/Regular">Copy Container children</Typography>
              </CopyContainer>
            </div>
            <div className="flex flex-col gap-1">
              <Typography variant="Body/M/Semibold">Tooltip Container</Typography>
              <CustomTooltip content="Tooltip content">
                <Typography variant="Body/M/Regular">Tooltip children</Typography>
              </CustomTooltip>
            </div>
            <div className="flex flex-col gap-1">
              <Typography variant="Body/M/Semibold">Pretty Container</Typography>
              <PrettyContainer
                title={<Typography variant="Body/XS/Semibold">Pretty Container Title</Typography>}
                content={JSON.stringify({ name: 'John Doe', age: 30 }, null, 2)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Typography variant="Body/M/Semibold">Number Format</Typography>
              <NumberFormat value={1000000.2222} truncateDecimals={2} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-8">
        <Typography variant="heading-1">Inputs</Typography>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <Typography variant="Body/M/Semibold">Select Field</Typography>
            <Typography variant="Body/S/Regular">
              Select field is a select input field with a label, placeholder, error message, hint text, required flag, read only flag, disabled flag, options
              and value.
            </Typography>
          </div>

          <div className="flex sm:flex-row flex-wrap flex-col gap-4">
            <MultiselectField label="Empty" placeholder="Value" />
            <MultiselectField
              label="Custom Empty"
              placeholder="Value"
              emptyIndicator={<AlertBlock notify={{ type: 'info', message: 'No available values' }} />}
            />
            <MultiselectField
              label="With options"
              placeholder="Value"
              options={[
                { label: 'Option 1', value: 'option1' },
                { label: 'Option 2', value: 'option2' },
              ]}
            />
            <MultiselectField
              label="Loading"
              placeholder="Value"
              isLoading
              options={[
                { label: 'Option 1', value: 'option1' },
                { label: 'Option 2', value: 'option2' },
              ]}
            />
            <MultiselectField
              label="Disabled"
              placeholder="Value"
              isLoading
              disabled
              options={[
                { label: 'Option 1', value: 'option1' },
                { label: 'Option 2', value: 'option2' },
              ]}
            />
            <MultiselectField
              label="Update by selected"
              placeholder="Value"
              updateBySelected
              options={[
                { label: 'Option 1', value: 'option1' },
                { label: 'Option 2', value: 'option2' },
              ]}
            />
            <MultiselectField
              label="Max selected 2"
              placeholder="Value"
              maxSelected={2}
              options={[
                { label: 'Option 1', value: 'option1' },
                { label: 'Option 2', value: 'option2' },
                { label: 'Option 3', value: 'option3' },
              ]}
            />
            <MultiselectField
              label="With Error"
              placeholder="Value"
              error="Select error"
              maxSelected={2}
              options={[
                { label: 'Option 1', value: 'option1' },
                { label: 'Option 2', value: 'option2' },
                { label: 'Option 3', value: 'option3' },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <Typography variant="Body/M/Semibold">Input Field</Typography>
            <Typography variant="Body/S/Regular">
              Input field is a text input field with a label, placeholder, error message, hint text, required flag, read only flag, disabled flag, email type,
              password type, number type and value.
            </Typography>
          </div>

          <div className="flex sm:flex-row flex-wrap flex-col gap-4">
            <InputField name="input-field" label="Input Field" placeholder="Input Field" />
            <InputField name="input-field-error" label="Input Field Error" placeholder="Input Field Error" error="Input Field Error" />
            <InputField name="input-field-hint" label="Input Field Hint" placeholder="Input Field Hint" hintText="Input Field Hint" />
            <InputField name="input-field-required" label="Input Field Required" placeholder="Input Field Required" required />
            <InputField name="input-field-read-only" label="Input Field Read Only" placeholder="Input Field Read Only" readOnly />
            <InputField name="input-field-disabled" label="Input Field Disabled" placeholder="Input Field Disabled" disabled />
            <InputField name="input-field-type" label="Input Field Email" placeholder="Input Field Email" type="email" />
            <InputField name="input-field-type" label="Input Field Password" placeholder="Input Field Password" type="password" />
            <InputField name="input-field-type" label="Input Field Number" placeholder="Input Field Number" type="number" />
            <InputField name="input-field-value" label="Input Field Value" placeholder="Input Field Value" defaultValue="Input Field Value" />
            <InputField
              name="input-field-value"
              label="Input Field Value With Content"
              placeholder="Input Field Value With Content"
              additionalComponent={
                <Button variant="outline" size="input-icon">
                  <SearchIcon className="w-3 h-3" />
                </Button>
              }
              classNames={{ input: 'pr-10' }}
            />
            <InputField
              name="input-field-value"
              label="Input Field Value With Content"
              placeholder="Input Field Value With Content"
              additionalComponent={
                <Button variant="outline" size="input-icon">
                  <ArrowLeftIcon className="w-3 h-3" />
                </Button>
              }
              additionalAlignment="left"
              classNames={{ input: 'pl-10' }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <Typography variant="Body/M/Semibold">Text Area Field</Typography>
            <Typography variant="Body/S/Regular">
              Text area field is a text area input field with a label, placeholder, error message, hint text, required flag, read only flag, disabled flag, max
              length and value.
            </Typography>
          </div>

          <div className="flex sm:flex-row flex-wrap flex-col gap-4">
            <TextAreaField name="text-area-field" label="Text Area Field" placeholder="Text Area Field" />
            <TextAreaWithState
              name="text-area-field-max-length"
              label="Text Area Field Max Length"
              placeholder="Text Area Field Max Length"
              maxLength={250}
              isShowMaxBagde
            />
            <TextAreaField name="text-area-field-error" label="Text Area Field Error" placeholder="Text Area Field Error" error="Text Area Field Error" />
            <TextAreaField name="text-area-field-hint" label="Text Area Field Hint" placeholder="Text Area Field Hint" hintText="Text Area Field Hint" />
            <TextAreaField name="text-area-field-required" label="Text Area Field Required" placeholder="Text Area Field Required" required />
            <TextAreaField name="text-area-field-read-only" label="Text Area Field Read Only" placeholder="Text Area Field Read Only" readOnly />
            <TextAreaField name="text-area-field-disabled" label="Text Area Field Disabled" placeholder="Text Area Field Disabled" disabled />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Typography variant="heading-1">Table</Typography>
          <Typography variant="Body/S/Regular">
            Customization for columns, rows and pagination. Choose what columns you need to display by using component props.
          </Typography>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex sm:flex-row flex-wrap flex-col gap-4">
            <CustomTable
              data={[
                { id: 1, name: 'John Doe', age: 20, isActive: true },
                { id: 2, name: 'Jane Doe', age: 21, isActive: false },
                { id: 3, name: 'John Smith', age: 22, isActive: true },
              ]}
              Row={({ item, columnKeys }) => {
                return (
                  <TableRow key={item.id}>
                    {columnKeys?.map((columnKey) => (
                      <TableCell key={columnKey}>{item[columnKey as keyof typeof item]?.toString?.()}</TableCell>
                    ))}
                  </TableRow>
                )
              }}
              columns={[
                { header: 'Name', accessorKey: 'name' },
                { header: 'Age', accessorKey: 'age' },
                { header: 'Is Active', accessorKey: 'isActive' },
              ]}
            />
            <Pagination pages={10} currentPage={1} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default UiKitRoot
